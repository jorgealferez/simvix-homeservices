import Anthropic from '@anthropic-ai/sdk';

/**
 * Cliente Anthropic con tres modos:
 *   - "live": hace llamadas reales (requiere ANTHROPIC_API_KEY)
 *   - "mock": respuestas deterministas para dev/CI/tests
 *   - "auto" (default): live si hay API key, mock si no
 */

export type AiMode = 'live' | 'mock' | 'auto';

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

export interface AiCallParams {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiCallResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  mocked: boolean;
}

// Tarifas aproximadas USD por 1M tokens. Sirven para auditoría interna, no son
// vinculantes; se sobreescriben con env si se quisiera (no hecho aquí para
// simplicidad).
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
};

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const tariff = PRICING_PER_MTOK[model] ?? PRICING_PER_MTOK['claude-opus-4-7'];
  return (inputTokens * tariff.input + outputTokens * tariff.output) / 1_000_000;
}

export async function callAi(params: AiCallParams): Promise<AiCallResult> {
  const model = params.model ?? DEFAULT_MODEL;
  const mode = resolveAiMode();

  if (mode === 'mock') {
    return mockCall(params, model);
  }

  const client = getClient();
  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 4096,
    temperature: params.temperature ?? 0.2,
    system: params.system,
    messages: params.messages,
  });

  const text = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim();

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  return {
    text,
    model,
    inputTokens,
    outputTokens,
    costUsd: estimateCostUsd(model, inputTokens, outputTokens),
    mocked: false,
  };
}

/**
 * Mock determinista. Devuelve un texto sintético con el último mensaje del
 * usuario y un marcador para que en UI se aprecie cuándo el agente no es real.
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
    costUsd: 0,
    mocked: true,
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
    // Intento adicional: buscar primer { o [ ... } o ]
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
