import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listRecentConfirmedPayments, type AsaasPayment } from '@/lib/asaas';
import { forcarLiberacaoPorUltimoPagamentoAsaas } from '@/lib/billing/ativarAssinaturaSegura';
import { resolverEmpresaIdPorPagamentoAsaas } from '@/lib/billing/resolverEmpresaPagamentoAsaas';
import { getCoberturaAteYmd } from '@/lib/billing/coberturaAssinatura';
import { BILLING_TIME_ZONE } from '@/lib/billing/billingTimeZone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_PAGAMENTOS = 40;
const MAX_EMPRESAS = 40;

function hojeYmdSp(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BILLING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function authorizeCron(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const tokenHeader = req.headers.get('x-internal-token');
  const internal = process.env.INTERNAL_ADMIN_TOKEN?.trim();
  if (internal && tokenHeader === internal) return true;

  if (req.headers.get('x-vercel-cron') === '1') return true;

  return false;
}

function pagamentoMaisNovo(a: AsaasPayment, b: AsaasPayment): AsaasPayment {
  const da = a.paymentDate || a.dueDate || '';
  const db = b.paymentDate || b.dueDate || '';
  return da >= db ? a : b;
}

/**
 * Rede de segurança externa: um pagamento (o último) por empresa.
 * GET /api/cron/liberar-assinaturas
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const hoje = hojeYmdSp();
  const started = Date.now();

  const porEmpresa = new Map<string, AsaasPayment>();
  try {
    const recentes = await listRecentConfirmedPayments(MAX_PAGAMENTOS);
    for (const p of recentes.slice(0, MAX_PAGAMENTOS)) {
      if (!p?.id || String(p.id).startsWith('mock_')) continue;
      if (Date.now() - started > 12000) break;
      const empresaId = await resolverEmpresaIdPorPagamentoAsaas(supabase, p.id, p);
      if (!empresaId) continue;
      const atual = porEmpresa.get(empresaId);
      porEmpresa.set(empresaId, atual ? pagamentoMaisNovo(atual, p) : p);
    }
  } catch (e) {
    console.error('cron liberar-assinaturas: listRecentConfirmedPayments', e);
  }

  const { data: assinaturas, error: assErr } = await supabase
    .from('assinaturas')
    .select('empresa_id, status, data_fim, proxima_cobranca, updated_at')
    .order('updated_at', { ascending: false })
    .limit(400);

  if (assErr) {
    console.error('cron liberar-assinaturas: assinaturas', assErr.message);
  }

  const visto = new Set<string>(porEmpresa.keys());
  for (const row of assinaturas || []) {
    const empresaId = String(row.empresa_id || '').trim();
    if (!empresaId || visto.has(empresaId)) continue;
    const cobertura = getCoberturaAteYmd(row);
    const status = String(row.status || '').toLowerCase();
    const vencida =
      (cobertura != null && cobertura < hoje) ||
      (!cobertura && ['expired', 'overdue', 'suspended', 'past_due'].includes(status));
    const inflada = cobertura != null && cobertura > hoje && cobertura.slice(0, 4) >= '2027';
    if (!vencida && !inflada) continue;
    visto.add(empresaId);
    if (visto.size >= MAX_EMPRESAS) break;
  }

  const empresasProcessadas: Array<{
    empresaId: string;
    ok: boolean;
    code?: string;
    error?: string;
    coberturaAte?: string;
  }> = [];
  let empresasOk = 0;
  let empresasFalha = 0;

  for (const empresaId of visto) {
    if (Date.now() - started > 27000) break;
    const result = await forcarLiberacaoPorUltimoPagamentoAsaas(supabase, empresaId);
    empresasProcessadas.push({
      empresaId,
      ok: result.ok,
      code: result.ok ? undefined : result.code,
      error: result.ok ? undefined : result.error,
      coberturaAte: result.ok ? result.coberturaAte : undefined,
    });
    if (result.ok) empresasOk++;
    else empresasFalha++;
  }

  return NextResponse.json({
    ok: true,
    hoje,
    elapsedMs: Date.now() - started,
    empresas: {
      candidatas: visto.size,
      ok: empresasOk,
      falha: empresasFalha,
      detalhes: empresasProcessadas.slice(0, 40),
    },
  });
}
