/** Supabase/PostgREST errors are often plain objects, not `instanceof Error`. */
export function getRequestErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.message === 'string' && o.message.trim()) parts.push(o.message.trim());
    if (typeof o.details === 'string' && o.details.trim()) parts.push(o.details.trim());
    if (typeof o.hint === 'string' && o.hint.trim()) parts.push(o.hint.trim());
    if (parts.length) return [...new Set(parts)].join(' — ');
    if (typeof o.code === 'string' && o.code.trim()) return `code: ${o.code}`;
  }
  return '';
}
