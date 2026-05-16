import { NextResponse } from 'next/server';
import { prisma, applySqlitePragmas } from '@/lib/db';
import { resolveAiMode } from '@/lib/ai/client';
import { listAgents } from '@/lib/ai/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  let dbOk = false;
  let dbLatency = -1;
  let error: string | undefined;

  try {
    await applySqlitePragmas();
    const tdb = Date.now();
    await prisma.$queryRawUnsafe('SELECT 1');
    dbLatency = Date.now() - tdb;
    dbOk = true;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const body = {
    ok: dbOk,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.2.0',
    nodeEnv: process.env.NODE_ENV,
    ai: {
      mode: resolveAiMode(),
      defaultModel: process.env.OBRAS_DEFAULT_MODEL ?? 'claude-opus-4-7',
      agents: listAgents().length,
    },
    db: {
      ok: dbOk,
      latencyMs: dbLatency,
      provider: (process.env.DATABASE_URL ?? '').startsWith('file:') ? 'sqlite' : 'postgres',
    },
    durationMs: Date.now() - t0,
    error,
  };

  return NextResponse.json(body, { status: dbOk ? 200 : 503 });
}
