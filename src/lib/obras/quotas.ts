import { prisma } from '@/lib/db';

export class QuotaExceededError extends Error {
  constructor(
    public readonly kind: 'projects' | 'aiTokensMonthly' | 'storageMb',
    public readonly limit: number,
    public readonly current: number,
  ) {
    super(`Cuota '${kind}' superada: ${current}/${limit}`);
    this.name = 'QuotaExceededError';
  }
}

export async function assertCanCreateProject(orgId: string): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.maxProjects) return;
  const count = await prisma.project.count({
    where: { orgId, deletedAt: null },
  });
  if (count >= org.maxProjects) {
    throw new QuotaExceededError('projects', org.maxProjects, count);
  }
}

export async function assertAiTokenBudget(orgId: string, plannedTokens: number): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.maxAiTokensMonthly) return;
  if (org.aiTokensMonthly + plannedTokens > org.maxAiTokensMonthly) {
    throw new QuotaExceededError(
      'aiTokensMonthly',
      org.maxAiTokensMonthly,
      org.aiTokensMonthly,
    );
  }
}

export async function recordAiTokens(orgId: string, totalTokens: number, costUsd: number): Promise<void> {
  if (!orgId) return;
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      aiTokensMonthly: { increment: totalTokens },
      aiCostUsdTotal: { increment: costUsd },
    },
  });
}

/**
 * Rebobina el contador mensual de tokens. Pensado para cron mensual
 * (`prisma/scripts/housekeeping.ts`).
 */
export async function resetMonthlyTokenCounters(): Promise<number> {
  const result = await prisma.organization.updateMany({
    where: { deletedAt: null },
    data: { aiTokensMonthly: 0 },
  });
  return result.count;
}
