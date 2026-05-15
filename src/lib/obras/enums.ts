/**
 * Enums de dominio modelados como uniones de string. Replican los antiguos
 * enums Prisma (no soportados por SQLite). El tipado se mantiene fuerte a
 * través del código de la app.
 */

export const PROJECT_STATUS = [
  'DRAFT',
  'IN_PROGRESS',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

export const OBRA_TYPES = [
  'REFORMA_INTERIOR',
  'REFORMA_INTEGRAL',
  'AMPLIACION',
  'OBRA_NUEVA',
  'REHABILITACION',
  'CAMBIO_USO',
  'LEGALIZACION',
  'DEMOLICION',
] as const;
export type ObraType = (typeof OBRA_TYPES)[number];

export const USE_TYPES = [
  'VIVIENDA',
  'LOCAL_COMERCIAL',
  'OFICINA',
  'INDUSTRIAL',
  'HOSTELERIA',
  'GARAJE',
  'TRASTERO',
  'OTROS',
] as const;
export type UseType = (typeof USE_TYPES)[number];

export const PHASE_TYPES = [
  'INTAKE',
  'NORMATIVA',
  'ANTEPROYECTO',
  'MEMORIA_TECNICA',
  'MEDICIONES',
  'PRESUPUESTO',
  'PLANOS',
  'ESS',
  'GESTION_RESIDUOS',
  'DOC_ADMINISTRATIVA',
  'PRESENTACION',
] as const;
export type PhaseType = (typeof PHASE_TYPES)[number];

export const PHASE_STATUSES = [
  'PENDING',
  'RUNNING',
  'NEEDS_REVIEW',
  'COMPLETED',
  'FAILED',
  'SKIPPED',
] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export const DOCUMENT_TYPES = [
  'INTAKE_BRIEF',
  'NORMATIVA_ANALYSIS',
  'ANTEPROYECTO',
  'MEMORIA_DESCRIPTIVA',
  'MEMORIA_CONSTRUCTIVA',
  'MEDICIONES',
  'PRESUPUESTO',
  'PLANO',
  'ESTUDIO_SS',
  'GESTION_RESIDUOS',
  'ESCRITO_AYUNTAMIENTO',
  'MODELO_TASA',
  'DECLARACION_RESPONSABLE',
  'AUTORIZACION_PROPIETARIO',
  'PAQUETE_FINAL',
  'OTROS',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_FORMATS = ['MARKDOWN', 'HTML', 'JSON', 'PDF', 'DXF', 'IFC'] as const;
export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number];

export const TASK_STATUSES = ['RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const SUBMISSION_CHANNELS = [
  'REGISTRO_TELEMATICO',
  'REGISTRO_PRESENCIAL',
  'SEDE_ELECTRONICA',
  'CORREO_POSTAL',
] as const;
export type SubmissionChannel = (typeof SUBMISSION_CHANNELS)[number];

export const SUBMISSION_STATUSES = [
  'PREPARED',
  'SUBMITTED',
  'REQUIRES_FIX',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const DRAWING_CATEGORIES = [
  'SITUACION',
  'EMPLAZAMIENTO',
  'ESTADO_ACTUAL',
  'ESTADO_REFORMADO',
  'COTAS_Y_SUPERFICIES',
  'INSTALACIONES_FONTANERIA',
  'INSTALACIONES_ELECTRICAS',
  'INSTALACIONES_SANEAMIENTO',
  'INSTALACIONES_CLIMA',
  'CARPINTERIA',
  'ALZADOS',
  'SECCIONES',
  'DETALLES',
  'OTROS',
] as const;
export type DrawingCategory = (typeof DRAWING_CATEGORIES)[number];
