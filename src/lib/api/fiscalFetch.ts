import { supabase } from '@/lib/supabaseClient';

/** Fetch autenticado para APIs /api/fiscal/* */
export async function fiscalFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

/** Lê JSON da resposta fiscal; se vier HTML/vazio (timeout etc.), devolve mensagem útil. */
export async function parseFiscalJson(
  res: Response
): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false,
      status: 'erro',
      message:
        res.status === 504 || res.status === 408
          ? `Tempo esgotado ao falar com a SEFAZ (HTTP ${res.status}). Tente de novo.`
          : `Falha ao emitir (HTTP ${res.status || '?'}) sem detalhes do servidor.`,
    };
  }
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    if (
      json &&
      typeof json === 'object' &&
      !json.message &&
      !json.error &&
      !res.ok
    ) {
      return {
        ...json,
        ok: false,
        message: `Falha ao emitir (HTTP ${res.status}).`,
      };
    }
    return json && typeof json === 'object' ? json : { ok: false, message: String(json) };
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 280);
    return {
      ok: false,
      status: 'erro',
      message:
        res.status === 504 || /timeout|timed out|FUNCTION_INVOCATION/i.test(snippet)
          ? `Tempo esgotado na emissão (HTTP ${res.status}). Tente novamente.`
          : `Erro HTTP ${res.status}: ${snippet || res.statusText || 'resposta inválida'}`,
    };
  }
}

export function msgFiscalErro(json: Record<string, unknown>, fallback: string): string {
  const base = String(
    json.message || json.error || json.xMotivo || json.motivo || fallback
  );
  const codigo = json.codigo != null ? String(json.codigo) : '';
  return codigo ? `[${codigo}] ${base}` : base;
}
