import Anthropic from '@anthropic-ai/sdk';

/**
 * Cliente Anthropic con tres modos:
 *   - "live": llamadas reales (requiere ANTHROPIC_API_KEY)
 *   - "mock": respuestas deterministas para dev/CI/tests
 *   - "auto" (default): live si hay API key, mock si no
 *
 * Capacidades P04:
 *   - Prompt caching (`cache_control: ephemeral`) sobre system prompt y bloques
 *     de contexto previo invariante. Reduce coste 90% sobre la parte cacheada.
 *   - Streaming SSE con `client.messages.stream()` + `.finalMessage()`.
 *   - Manejo de stop_reason (refusal, pause_turn, max_tokens) explícito.
 *   - Token counting helper para presupuestos previos.
 *   - Effort parameter (low/medium/high/xhigh/max) por agente.
 *   - Adaptive thinking (Opus 4.7 / Opus 4.6 / Sonnet 4.6).
 */

export type AiMode = 'live' | 'mock' | 'auto';
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export function resolveAiMode(): 'live' | 'mock' {
  const mode = (process.env.OBRAS_AI_MODE as AiMode | undefined) ?? 'auto';
  if (mode === 'live') return 'live';
  if (mode === 'mock') return 'mock';
  return process.env.ANTHROPIC_API_KEY ? 'live' : 'mock';
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY no está definida. Configúrala en .env.local o usa OBRAS_AI_MODE=mock.',
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const DEFAULT_MODEL = process.env.OBRAS_DEFAULT_MODEL ?? 'claude-opus-4-7';

/** Tarifas por 1M tokens (USD). Usadas sólo para auditoría interna. */
const PRICING_PER_MTOK: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite5m: number }
> = {
  'claude-opus-4-7': { input: 5, output: 25, cacheRead: 0.5, cacheWrite5m: 6.25 },
  'claude-opus-4-6': { input: 5, output: 25, cacheRead: 0.5, cacheWrite5m: 6.25 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite5m: 3.75 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite5m: 1.25 },
};

function pricing(model: string) {
  return PRICING_PER_MTOK[model] ?? PRICING_PER_MTOK['claude-opus-4-7'];
}

function estimateCostUsd(
  model: string,
  input: number,
  output: number,
  cacheRead = 0,
  cacheWrite = 0,
): number {
  const p = pricing(model);
  return (
    (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheWrite * p.cacheWrite5m) /
    1_000_000
  );
}

export interface CacheBlock {
  /** Texto que se cachea como bloque independiente (system o user). */
  text: string;
  /** Posición: parte del system prompt, o un bloque al inicio del user. */
  role: 'system' | 'user';
}

export interface AiCallParams {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
  effort?: Effort;
  /** Bloques adicionales que merecen cache_control independiente (≤ 3 extras además del system). */
  cacheableBlocks?: CacheBlock[];
  /** Si true, marca el system prompt con cache_control (default: true). */
  cacheSystem?: boolean;
  /** Activa adaptive thinking para razonamiento (default: true en Opus). */
  thinking?: boolean;
}

export interface AiCallResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  mocked: boolean;
  stopReason: string | null;
  /** Si el modelo rechazó por seguridad. */
  refusal?: { category?: string | null; explanation?: string | null };
}

function buildSystemBlocks(
  system: string,
  cacheSystem: boolean,
): Anthropic.Messages.TextBlockParam[] {
  if (!system) return [];
  const block: Anthropic.Messages.TextBlockParam = { type: 'text', text: system };
  if (cacheSystem) {
    block.cache_control = { type: 'ephemeral' };
  }
  return [block];
}

function buildMessages(
  params: AiCallParams,
): Anthropic.Messages.MessageParam[] {
  const messages: Anthropic.Messages.MessageParam[] = [];

  // Bloques cacheables del lado user antes de los mensajes reales (típico:
  // documentos previos invariantes para esta fase).
  const userCacheBlocks = (params.cacheableBlocks ?? []).filter((b) => b.role === 'user');

  if (userCacheBlocks.length && params.messages.length > 0) {
    // Inyectamos los bloques cacheables como contenido del primer turno user.
    const [first, ...rest] = params.messages;
    if (first.role === 'user') {
      const content: Anthropic.Messages.TextBlockParam[] = [];
      for (const cb of userCacheBlocks) {
        content.push({
          type: 'text',
          text: cb.text,
          cache_control: { type: 'ephemeral' },
        });
      }
      content.push({ type: 'text', text: first.content });
      messages.push({ role: 'user', content });
      messages.push(...rest);
      return messages;
    }
  }
  return params.messages;
}

function effortToConfig(effort: Effort | undefined): Anthropic.Messages.OutputConfig | undefined {
  if (!effort) return undefined;
  return { effort };
}

export async function callAi(params: AiCallParams): Promise<AiCallResult> {
  const model = params.model ?? DEFAULT_MODEL;
  const mode = resolveAiMode();

  if (mode === 'mock') {
    return mockCall(params, model);
  }

  const client = getClient();
  const cacheSystem = params.cacheSystem ?? true;

  const create: Parameters<typeof client.messages.create>[0] = {
    model,
    max_tokens: params.maxTokens ?? 4096,
    system: buildSystemBlocks(params.system, cacheSystem),
    messages: buildMessages(params),
  };

  // Opus 4.7 / 4.6 + Sonnet 4.6: adaptive thinking para tareas complejas.
  if (params.thinking !== false && /opus|sonnet/.test(model)) {
    create.thinking = { type: 'adaptive' };
  }

  const oc = effortToConfig(params.effort);
  if (oc) create.output_config = oc;

  // Streaming siempre que max_tokens >= 4096 (recomendación SDK para evitar
  // timeouts HTTP). Usamos finalMessage() para recoger el agregado.
  const stream = client.messages.stream(create);
  const final = await stream.finalMessage();

  const text = final.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();

  const inputTokens = final.usage?.input_tokens ?? 0;
  const outputTokens = final.usage?.output_tokens ?? 0;
  const cacheReadTokens = final.usage?.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = final.usage?.cache_creation_input_tokens ?? 0;

  const result: AiCallResult = {
    text,
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    costUsd: estimateCostUsd(model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens),
    mocked: false,
    stopReason: final.stop_reason,
  };

  if (final.stop_reason === 'refusal') {
    const details = (final as unknown as { stop_details?: { category?: string | null; explanation?: string | null } })
      .stop_details;
    result.refusal = {
      category: details?.category ?? null,
      explanation: details?.explanation ?? null,
    };
  }

  return result;
}

/**
 * Streaming variant: yields text chunks as they arrive. Devuelve el resultado
 * agregado al final.
 */
export async function* callAiStream(
  params: AiCallParams,
): AsyncGenerator<{ delta: string }, AiCallResult, void> {
  const model = params.model ?? DEFAULT_MODEL;
  const mode = resolveAiMode();

  if (mode === 'mock') {
    const result = mockCall(params, model);
    // Stream synthetically chunked
    const chunks = result.text.match(/.{1,40}/gs) ?? [result.text];
    for (const c of chunks) yield { delta: c };
    return result;
  }

  const client = getClient();
  const cacheSystem = params.cacheSystem ?? true;

  const create: Parameters<typeof client.messages.create>[0] = {
    model,
    max_tokens: params.maxTokens ?? 4096,
    system: buildSystemBlocks(params.system, cacheSystem),
    messages: buildMessages(params),
  };
  if (params.thinking !== false && /opus|sonnet/.test(model)) {
    create.thinking = { type: 'adaptive' };
  }
  const oc = effortToConfig(params.effort);
  if (oc) create.output_config = oc;

  const stream = client.messages.stream(create);

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { delta: event.delta.text };
    }
  }

  const final = await stream.finalMessage();
  const text = final.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();

  const inputTokens = final.usage?.input_tokens ?? 0;
  const outputTokens = final.usage?.output_tokens ?? 0;
  const cacheReadTokens = final.usage?.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = final.usage?.cache_creation_input_tokens ?? 0;

  const result: AiCallResult = {
    text,
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    costUsd: estimateCostUsd(model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens),
    mocked: false,
    stopReason: final.stop_reason,
  };

  if (final.stop_reason === 'refusal') {
    const details = (final as unknown as { stop_details?: { category?: string | null; explanation?: string | null } })
      .stop_details;
    result.refusal = {
      category: details?.category ?? null,
      explanation: details?.explanation ?? null,
    };
  }
  return result;
}

/** Llama al endpoint de count_tokens para estimar antes de ejecutar. */
export async function countTokens(params: AiCallParams): Promise<number> {
  const model = params.model ?? DEFAULT_MODEL;
  const mode = resolveAiMode();
  if (mode === 'mock') {
    // Estimación grosera: 4 chars/token
    const all = params.system + params.messages.map((m) => m.content).join('');
    return Math.ceil(all.length / 4);
  }
  const client = getClient();
  const res = await client.messages.countTokens({
    model,
    system: buildSystemBlocks(params.system, false),
    messages: buildMessages(params),
  });
  return res.input_tokens;
}

/**
 * Mock determinista para dev/CI sin API key.
 */
function mockCall(params: AiCallParams, model: string): AiCallResult {
  const lastUser = [...params.messages].reverse().find((m) => m.role === 'user');
  const echo = lastUser?.content ?? '';
  const heading = params.system.split('\n').find(Boolean)?.slice(0, 80) ?? 'Agente IA (mock)';

  const body =
    `# ${heading}\n\n` +
    `> *(Respuesta simulada — sin ANTHROPIC_API_KEY)*\n\n` +
    `**Entrada recibida:**\n\n${echo.slice(0, 800)}\n\n` +
    `**Respuesta sintetizada:**\n\n` +
    `1. Se han identificado los puntos clave de la solicitud.\n` +
    `2. Se aplicarían las normativas habituales para el tipo de obra indicado.\n` +
    `3. Se generaría a continuación el entregable estructurado de esta fase.\n`;

  const inputTokens = Math.max(1, Math.floor(echo.length / 4));
  const outputTokens = Math.max(1, Math.floor(body.length / 4));

  return {
    text: body,
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    costUsd: 0,
    mocked: true,
    stopReason: 'end_turn',
  };
}

/**
 * Helper: parsea bloque ```json ... ``` o JSON directo de la respuesta.
 * Devuelve null si no encuentra JSON válido.
 */
export function tryExtractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const first = candidate.search(/[{[]/);
    if (first < 0) return null;
    const lastObj = candidate.lastIndexOf('}');
    const lastArr = candidate.lastIndexOf(']');
    const last = Math.max(lastObj, lastArr);
    if (last < first) return null;
    try {
      return JSON.parse(candidate.slice(first, last + 1)) as T;
    } catch {
      return null;
    }
  }
}
