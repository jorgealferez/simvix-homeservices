/**
 * Tiny class-name combinator. Equivalente a `clsx` pero sin dependencia.
 * Acepta strings, undefined/null y booleans (los descarta).
 */
export function cn(...parts: Array<string | undefined | null | false | 0>): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}
