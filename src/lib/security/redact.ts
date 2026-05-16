/**
 * Redacción de PII (DNI, NIE, IBAN, teléfonos, emails) antes de enviar a
 * Claude. La idea es que los agentes de IA trabajen sobre datos pseudonimizados
 * en sus prompts; el documento generado se puede re-hidratar después si el
 * cliente final lo requiere (no implementado todavía).
 *
 * Estrategia: reemplazar matches por placeholders deterministas (`[DNI_1]`,
 * `[EMAIL_2]`, ...) para que el modelo pueda razonar sobre referencias sin ver
 * el dato real.
 */

const PATTERNS: { name: string; rx: RegExp }[] = [
  // DNI español: 8 dígitos + letra
  { name: 'DNI', rx: /\b[0-9]{8}[A-HJ-NP-TV-Z]\b/g },
  // NIE: X/Y/Z + 7 dígitos + letra
  { name: 'NIE', rx: /\b[XYZ][0-9]{7}[A-HJ-NP-TV-Z]\b/gi },
  // CIF empresarial
  { name: 'CIF', rx: /\b[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]\b/g },
  // Email
  { name: 'EMAIL', rx: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  // IBAN español: ES + 22 dígitos, normalmente formateado en 6 grupos de 4
  { name: 'IBAN', rx: /\bES[0-9]{2}(?:[\s-]?[0-9]{4}){5}\b/gi },
  // Teléfono español (con o sin prefijo +34)
  { name: 'PHONE', rx: /(?:\+?34[\s-]?)?(?:[6-9][0-9]{2})[\s-]?[0-9]{3}[\s-]?[0-9]{3}\b/g },
  // Tarjetas de crédito (Luhn no validado, sólo formato 13-19 dígitos)
  { name: 'CARD', rx: /\b(?:[0-9]{4}[\s-]?){3,4}[0-9]{1,4}\b/g },
];

export interface RedactionResult {
  text: string;
  /** Mapping placeholder → valor original (para re-hidratación si fuera necesario). */
  mapping: Record<string, string>;
}

export function redactPII(input: string | null | undefined): RedactionResult {
  if (!input) return { text: input ?? '', mapping: {} };
  const counters: Record<string, number> = {};
  const mapping: Record<string, string> = {};
  let out = input;

  for (const { name, rx } of PATTERNS) {
    out = out.replace(rx, (match) => {
      counters[name] = (counters[name] ?? 0) + 1;
      const placeholder = `[${name}_${counters[name]}]`;
      mapping[placeholder] = match;
      return placeholder;
    });
  }

  return { text: out, mapping };
}

/** Detecta si un texto contiene PII evidente (sin redactar). */
export function containsPII(input: string | null | undefined): boolean {
  if (!input) return false;
  return PATTERNS.some(({ rx }) => {
    rx.lastIndex = 0;
    return rx.test(input);
  });
}
