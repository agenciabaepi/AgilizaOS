import type { Session } from '@supabase/supabase-js';

/** Headers para fetch do browser → Route Handlers que usam `getSessionUserId` (cookie ou Bearer). */
export function bearerAuthHeaders(
  session: Session | null | undefined,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
