import { z } from 'zod';
import { services } from './services';
import { zonas } from './zonas';

/**
 * Contrato del formulario de contacto: familias que piden un servicio y
 * profesionales que se apuntan. Validado en servidor (no se confía en el
 * cliente) y compartido con los tests.
 */
export const ROLES = ['familia', 'profesional'] as const;
export type Rol = (typeof ROLES)[number];

const slugsServicio = services.map((s) => s.id) as [string, ...string[]];
const slugsZona = zonas.map((z) => z.slug) as [string, ...string[]];

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d\s().-]*$/, 'Teléfono no válido')
    .optional()
    .default(''),
  service: z.enum(slugsServicio),
  rol: z.enum(ROLES).default('familia'),
  zona: z.union([z.enum(slugsZona), z.literal('otra')]).default('otra'),
  message: z.string().trim().max(2000).optional().default(''),
  /** RGPD: sin consentimiento expreso no se tratan los datos. */
  consentimiento: z.literal(true),
  /** utm_source / utm_campaign del anuncio o publicación de la que viene el lead. */
  origen: z
    .string()
    .trim()
    .max(80)
    .regex(/^[\w.:/-]*$/)
    .optional()
    .default(''),
});

export type Lead = z.infer<typeof leadSchema>;
