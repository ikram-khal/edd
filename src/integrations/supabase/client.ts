import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/** Base URL only: https://xxxx.supabase.co (no /rest/v1, no trailing slash). */
function normalizeSupabaseUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  try {
    const u = new URL(s);
    return u.origin;
  } catch {
    return s.replace(/\/+$/, '');
  }
}

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

/** False on Vercel if env vars were not set at build time — app still mounts; API calls will fail. */
export const isSupabaseConfigured = Boolean(url && key);

// createClient(undefined, undefined) throws immediately and yields a white screen
const FALLBACK_URL = 'https://placeholder-not-configured.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDE3OTkyMDAsImV4cCI6MTk1NzM3NTIwMH0.invalid-signature-placeholder';

export const supabase = createClient<Database>(url || FALLBACK_URL, key || FALLBACK_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
