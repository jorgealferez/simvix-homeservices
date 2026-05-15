import type { PhaseType } from './enums';

export interface PhaseDef {
  type: PhaseType;
  order: number;
  label: string;
  short: string;
  icon: string;
  description: string;
  /** documentos que produce esta fase (DocumentType) */
  produces: string[];
  /** documentos que necesita de fases anteriores */
  consumes: string[];
}

export const PHASES: PhaseDef[] = [
  {
    type: 'INTAKE',
    order: 1,
    label: 'Captura de necesidad',
    short: 'Intake',
    icon: '🗣️',
    description: 'Entrevista inicial estructurada con el cliente y brief del proyecto.',
    produces: ['INTAKE_BRIEF'],
    consumes: [],
  },
  {
    type: 'NORMATIVA',
    order: 2,
    label: 'Análisis normativo',
    short: 'Normativa',
    icon: '⚖️',
    description: 'PGOU, CTE, accesibilidad, régimen de licencia aplicable.',
    produces: ['NORMATIVA_ANALYSIS'],
    consumes: ['INTAKE_BRIEF'],
  },
  {
    type: 'ANTEPROYECTO',
    order: 3,
    label: 'Anteproyecto',
    short: 'Anteproyecto',
    icon: '✏️',
    description: 'Programa, esquema espacial, estimación inicial de coste y plazos.',
    produces: ['ANTEPROYECTO'],
    consumes: ['INTAKE_BRIEF', 'NORMATIVA_ANALYSIS'],
  },
  {
    type: 'MEMORIA_TECNICA',
    order: 4,
    label: 'Memoria técnica',
    short: 'Memoria',
    icon: '📘',
    description: 'Memoria descriptiva y constructiva conforme CTE.',
    produces: ['MEMORIA_DESCRIPTIVA', 'MEMORIA_CONSTRUCTIVA'],
    consumes: ['INTAKE_BRIEF', 'NORMATIVA_ANALYSIS', 'ANTEPROYECTO'],
  },
  {
    type: 'MEDICIONES',
    order: 5,
    label: 'Mediciones',
    short: 'Mediciones',
    icon: '📏',
    description: 'Capítulos y partidas con sus cantidades.',
    produces: ['MEDICIONES'],
    consumes: ['ANTEPROYECTO', 'MEMORIA_DESCRIPTIVA'],
  },
  {
    type: 'PRESUPUESTO',
    order: 6,
    label: 'Presupuesto',
    short: 'Presupuesto',
    icon: '💶',
    description: 'Precios unitarios, totales por capítulo, PEM, PEC, IVA.',
    produces: ['PRESUPUESTO'],
    consumes: ['MEDICIONES', 'MEMORIA_DESCRIPTIVA'],
  },
  {
    type: 'PLANOS',
    order: 7,
    label: 'Plan de planos',
    short: 'Planos',
    icon: '📐',
    description: 'Listado de planos requeridos y criterios de representación.',
    produces: ['PLANO'],
    consumes: ['ANTEPROYECTO', 'MEMORIA_DESCRIPTIVA'],
  },
  {
    type: 'ESS',
    order: 8,
    label: 'Seguridad y salud',
    short: 'ESS',
    icon: '🦺',
    description: 'Estudio básico de seguridad y salud (RD 1627/1997).',
    produces: ['ESTUDIO_SS'],
    consumes: ['MEMORIA_DESCRIPTIVA', 'MEDICIONES'],
  },
  {
    type: 'GESTION_RESIDUOS',
    order: 9,
    label: 'Gestión de residuos',
    short: 'Residuos',
    icon: '♻️',
    description: 'Estudio RCD (RD 105/2008).',
    produces: ['GESTION_RESIDUOS'],
    consumes: ['MEMORIA_DESCRIPTIVA'],
  },
  {
    type: 'DOC_ADMINISTRATIVA',
    order: 10,
    label: 'Doc. administrativa',
    short: 'Admin.',
    icon: '🗂️',
    description: 'Modelos de solicitud, declaraciones responsables, tasas, autorizaciones.',
    produces: ['DECLARACION_RESPONSABLE', 'AUTORIZACION_PROPIETARIO', 'MODELO_TASA'],
    consumes: ['NORMATIVA_ANALYSIS'],
  },
  {
    type: 'PRESENTACION',
    order: 11,
    label: 'Presentación al ayuntamiento',
    short: 'Ayuntamiento',
    icon: '🏛️',
    description: 'Escrito de presentación + paquete documental completo.',
    produces: ['ESCRITO_AYUNTAMIENTO', 'PAQUETE_FINAL'],
    consumes: [
      'INTAKE_BRIEF',
      'NORMATIVA_ANALYSIS',
      'MEMORIA_DESCRIPTIVA',
      'PRESUPUESTO',
      'ESTUDIO_SS',
      'GESTION_RESIDUOS',
      'DECLARACION_RESPONSABLE',
    ],
  },
];

export function getPhaseDef(type: PhaseType): PhaseDef | undefined {
  return PHASES.find((p) => p.type === type);
}

export function nextPhaseOf(type: PhaseType): PhaseType | null {
  const idx = PHASES.findIndex((p) => p.type === type);
  if (idx < 0 || idx === PHASES.length - 1) return null;
  return PHASES[idx + 1].type;
}

export function previousPhaseOf(type: PhaseType): PhaseType | null {
  const idx = PHASES.findIndex((p) => p.type === type);
  if (idx <= 0) return null;
  return PHASES[idx - 1].type;
}
