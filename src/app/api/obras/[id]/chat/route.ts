import { prisma } from '@/lib/db';
import { z } from 'zod';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { callAiStream, type Effort } from '@/lib/ai/client';
import { getAgentByPhase } from '@/lib/ai/registry';
import type { PhaseType } from '@/lib/obras/enums';
import { redactPII } from '@/lib/security/redact';

interface Params {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  phase: z.string().optional(), // qué agente usar; default = currentPhase del proyecto
});

/**
 * SSE endpoint: streamea la respuesta de Claude token a token al cliente.
 * Persiste la conversación al terminar (no chunk a chunk, para reducir
 * presión sobre la BD).
 *
 * Soporta cancelación: si el cliente cierra la conexión, abortamos la lectura
 * y persistimos lo que se haya generado.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:run-phase');
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
    });
    if (!project) {
      return new Response(JSON.stringify({ error: 'No encontrado' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (!ctx.isPlatformAdmin && project.orgId && project.orgId !== ctx.activeOrgId) {
      return new Response(JSON.stringify({ error: 'No accesible desde esta organización' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    const phase = (parsed.data.phase ?? project.currentPhase) as PhaseType;
    const agent = getAgentByPhase(phase);
    if (!agent) {
      return new Response(JSON.stringify({ error: `Sin agente para fase ${phase}` }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Recupera la versión más reciente de cada DocumentType
    const prior: Record<string, string> = {};
    for (const d of project.documents) {
      if (!prior[d.type]) prior[d.type] = d.content;
    }

    // Persistimos el mensaje del usuario YA (independiente del stream)
    const userMsg = await prisma.conversation.create({
      data: {
        projectId: id,
        agent: agent.name,
        role: 'user',
        content: parsed.data.message,
      },
    });

    const safeUserInput = redactPII(parsed.data.message).text;
    const safePrior = Object.fromEntries(
      Object.entries(prior).map(([k, v]) => [k, redactPII(v).text]),
    );

    const ctxObj = { project, prior: safePrior, userInput: safeUserInput };
    const system = agent.systemPrompt(ctxObj);
    const messages = agent.buildMessages(ctxObj);

    const encoder = new TextEncoder();
    let aborted = false;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        send('start', { agent: agent.name, phase, userMessageId: userMsg.id });

        let assembled = '';
        const t0 = Date.now();
        try {
          const gen = callAiStream({
            system,
            messages,
            model: agent.preferredModel,
            maxTokens: 4096,
            effort: (agent.preferredEffort ?? 'medium') as Effort,
          });

          // Recogemos manualmente el value de la última iteración (que un
          // generator devuelve cuando `done: true`).
          let result: Awaited<ReturnType<typeof callAiStream>> extends AsyncGenerator<unknown, infer R, unknown> ? R | undefined : undefined;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const step = await gen.next();
            if (step.done) {
              result = step.value;
              break;
            }
            if (aborted) {
              await gen.return(undefined as unknown as never).catch(() => undefined);
              break;
            }
            assembled += step.value.delta;
            send('delta', { text: step.value.delta });
          }

          // Persistir mensaje del assistant y métricas
          await prisma.conversation.create({
            data: {
              projectId: id,
              agent: agent.name,
              role: 'assistant',
              content: assembled,
              inputTokens: result?.inputTokens ?? null,
              outputTokens: result?.outputTokens ?? null,
              costUsd: result?.costUsd ?? null,
              model: result?.model ?? null,
            },
          });

          if (result) {
            await prisma.project.update({
              where: { id },
              data: {
                aiCostUsd: { increment: result.costUsd ?? 0 },
                aiInputTokens: {
                  increment: (result.inputTokens ?? 0) + (result.cacheCreationTokens ?? 0) + (result.cacheReadTokens ?? 0),
                },
                aiOutputTokens: { increment: result.outputTokens ?? 0 },
              },
            });
          }

          send('done', {
            durationMs: Date.now() - t0,
            usage: {
              inputTokens: result?.inputTokens ?? 0,
              outputTokens: result?.outputTokens ?? 0,
              cacheReadTokens: result?.cacheReadTokens ?? 0,
              cacheCreationTokens: result?.cacheCreationTokens ?? 0,
              costUsd: result?.costUsd ?? 0,
              stopReason: result?.stopReason ?? null,
              mocked: result?.mocked ?? false,
            },
          });
          controller.close();
        } catch (err) {
          send('error', { message: err instanceof Error ? err.message : String(err) });
          controller.close();
        }
      },
      cancel() {
        aborted = true;
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no', // desactiva buffering en proxys nginx-like
      },
    });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
