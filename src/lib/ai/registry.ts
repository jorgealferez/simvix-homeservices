import type { PhaseType } from '@/lib/obras/enums';
import type { Agent } from './agents/base';
import { intakeAgent } from './agents/intake';
import { normativaAgent } from './agents/normativa';
import { anteproyectoAgent } from './agents/anteproyecto';
import { memoriaTecnicaAgent } from './agents/memoria-tecnica';
import { medicionesAgent } from './agents/mediciones';
import { presupuestoAgent } from './agents/presupuesto';
import { planosAgent } from './agents/planos';
import { essAgent } from './agents/ess';
import { residuosAgent } from './agents/residuos';
import { docAdministrativaAgent } from './agents/doc-administrativa';
import { ayuntamientoAgent } from './agents/ayuntamiento';

export const AGENTS: Agent[] = [
  intakeAgent,
  normativaAgent,
  anteproyectoAgent,
  memoriaTecnicaAgent,
  medicionesAgent,
  presupuestoAgent,
  planosAgent,
  essAgent,
  residuosAgent,
  docAdministrativaAgent,
  ayuntamientoAgent,
];

export function getAgentByName(name: string): Agent | undefined {
  return AGENTS.find((a) => a.name === name);
}

export function getAgentByPhase(phase: PhaseType): Agent | undefined {
  return AGENTS.find((a) => a.phase === phase);
}

export function listAgents(): Agent[] {
  return AGENTS;
}
