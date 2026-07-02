import type { Session } from '@supabase/supabase-js';
import { getAccessTokenForApi } from '@/lib/supabaseClient';

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

/**
 * Mesmo papel de bearerAuthHeaders, mas obtém token atualizado no storage do browser
 * (evita 401 quando cookies SSR ainda não refletem a sessão do cliente).
 */
export async function bearerAuthHeadersForApi(
  session: Session | null | undefined,
  extra?: Record<string, string>
): Promise<Record<string, string>> {
  let token = (await getAccessTokenForApi()) ?? session?.access_token ?? null;
  if (!token) {
    await new Promise((r) => setTimeout(r, 150));
    token = (await getAccessTokenForApi()) ?? session?.access_token ?? null;
  }
  const headers: Record<string, string> = { ...(extra || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
