import { buildLlmsTxt } from '@/lib/llms';

/** /llms.txt: resumen en texto plano para asistentes de IA (GEO). */
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
