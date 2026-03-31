import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

const STATUS_URL = 'https://status.supabase.com/api/v2/status.json';
const INCIDENTS_URL = 'https://status.supabase.com/api/v2/incidents.json';
const STATUS_PAGE_URL = 'https://status.supabase.com';
const DB_HEALTH_TIMEOUT_MS = 8000;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Verifica se a conexão com o NOSSO banco Supabase responde (query real). */
async function checkOurDatabase(): Promise<boolean> {
  const timeout = new Promise<boolean>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), DB_HEALTH_TIMEOUT_MS)
  );
  const query = (async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.from('empresas').select('id').limit(1);
    return !error;
  })();
  return Promise.race([query, timeout]) as Promise<boolean>;
}

/** Busca descrição de incidente no status do Supabase (só para mensagem quando nosso DB falhou). */
async function getStatusPageMessage(): Promise<{ indicator: string; description: string }> {
  try {
    const incidentsRes = await fetch(INCIDENTS_URL, { next: { revalidate: 0 }, headers: { Accept: 'application/json' } });
    if (incidentsRes.ok) {
      const data = await incidentsRes.json();
      const incidents = data?.incidents ?? [];
      const unresolved = incidents.find(
        (i: { status: string }) => !['resolved', 'completed', 'postmortem'].includes(i.status)
      );
      if (unresolved) {
        const last = unresolved.incident_updates?.[0]?.body;
        return {
          indicator: unresolved.impact || 'major',
          description: last ? `${unresolved.name}. ${String(last).slice(0, 120)}…` : unresolved.name,
        };
      }
    }
    const statusRes = await fetch(STATUS_URL, { next: { revalidate: 0 }, headers: { Accept: 'application/json' } });
    if (statusRes.ok) {
      const d = await statusRes.json();
      return { indicator: d?.status?.indicator ?? 'none', description: d?.status?.description ?? 'All Systems Operational' };
    }
  } catch {
    // ignore
  }
  return { indicator: 'unknown', description: 'Instabilidade no serviço de dados' };
}

/**
 * GET /api/supabase-status
 * 1) Verifica a conexão real com o NOSSO banco (query em empresas).
 * 2) Se o banco não responder, opcionalmente busca mensagem do status.supabase.com.
 */
export async function GET() {
  try {
    const dbOk = await checkOurDatabase();
    if (dbOk) {
      return NextResponse.json({
        ok: true,
        indicator: 'none',
        description: 'Conexão com o banco OK',
        url: STATUS_PAGE_URL,
      });
    }
  } catch (e) {
    // Nosso banco não respondeu; buscar mensagem do status para contexto
  }

  const { indicator, description } = await getStatusPageMessage();
  return NextResponse.json({
    ok: false,
    indicator,
    description,
    url: STATUS_PAGE_URL,
  });
}
