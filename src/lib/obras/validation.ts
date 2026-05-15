import { z } from 'zod';
import { OBRA_TYPES, USE_TYPES, PHASE_TYPES } from './enums';

export const obraTypeEnum = z.enum(OBRA_TYPES as readonly [string, ...string[]]);
export const useTypeEnum = z.enum(USE_TYPES as readonly [string, ...string[]]);

export const createProjectSchema = z.object({
  client: z.object({
    fullName: z.string().min(2, 'Nombre demasiado corto'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
    dni: z.string().optional(),
    address: z.string().optional(),
  }),
  project: z.object({
    title: z.string().min(3),
    summary: z.string().optional(),
    addressLine: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    cadastralId: z.string().optional(),
    obraType: obraTypeEnum,
    useType: useTypeEnum,
    surfaceM2: z.number().positive().optional(),
    ayuntamientoSlug: z.string().optional(),
  }),
  intakeMessage: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const runPhaseSchema = z.object({
  phase: z.enum(PHASE_TYPES as readonly [string, ...string[]]),
  userInput: z.string().optional(),
});

export type RunPhaseInput = z.infer<typeof runPhaseSchema>;
