import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';

/** Fetch autenticado para rotas /api/whatsapp/crm/* (Bearer do localStorage Supabase). */
export async function whatsappCrmFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const extra =
    init?.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : (init?.headers as Record<string, string> | undefined);

  const headers = await bearerAuthHeadersForApi(null, extra);

  return fetch(input, {
    credentials: 'include',
    ...init,
    headers,
  });
}
