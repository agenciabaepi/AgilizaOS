import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listRecentConfirmedPayments } from '@/lib/asaas';
import {
  forcarLiberacaoPorUltimoPagamentoAsaas,
  processarPagamentoConfirmado,
} from '@/lib/billing/ativarAssinaturaSegura';
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

/**
 * Rede de segurança: pagamentos confirmados no Asaas que o webhook não aplicou
 * (PIX gerado só no Asaas, vencimento no dia, e-mail diferente, etc.).
 *
 * GET /api/cron/liberar-assinaturas
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const hoje = hojeYmdSp();
  const started = Date.now();

  const pagamentosProcessados: Array<{
    paymentId: string;
    ok: boolean;
    code?: string;
    error?: string;
    coberturaAte?: string;
  }> = [];
  let pagamentosOk = 0;
  let pagamentosFalha = 0;

  try {
    const recentes = await listRecentConfirmedPayments(MAX_PAGAMENTOS);
    for (const p of recentes.slice(0, MAX_PAGAMENTOS)) {
      if (!p?.id || String(p.id).startsWith('mock_')) continue;
      if (Date.now() - started > 22000) break;

      const result = await processarPagamentoConfirmado(supabase, {
        asaasPaymentId: p.id,
        payment: p,
      });
      pagamentosProcessados.push({
        paymentId: p.id,
        ok: result.ok,
        code: result.ok ? undefined : result.code,
        error: result.ok ? undefined : result.error,
        coberturaAte: result.ok ? result.coberturaAte : undefined,
      });
      if (result.ok) pagamentosOk++;
      else pagamentosFalha++;
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

  const empresasVencidas: string[] = [];
  const visto = new Set<string>();
  for (const row of assinaturas || []) {
    const empresaId = String(row.empresa_id || '').trim();
    if (!empresaId || visto.has(empresaId)) continue;
    const cobertura = getCoberturaAteYmd(row);
    const status = String(row.status || '').toLowerCase();
    const vencida =
      (cobertura != null && cobertura < hoje) ||
      (!cobertura && ['expired', 'overdue', 'suspended', 'past_due'].includes(status));
    if (!vencida) continue;
    visto.add(empresaId);
    empresasVencidas.push(empresaId);
    if (empresasVencidas.length >= MAX_EMPRESAS) break;
  }

  const empresasProcessadas: Array<{
    empresaId: string;
    ok: boolean;
    code?: string;
    error?: string;
  }> = [];
  let empresasOk = 0;
  let empresasFalha = 0;

  for (const empresaId of empresasVencidas) {
    if (Date.now() - started > 27000) break;
    const result = await forcarLiberacaoPorUltimoPagamentoAsaas(supabase, empresaId);
    empresasProcessadas.push({
      empresaId,
      ok: result.ok,
      code: result.ok ? undefined : result.code,
      error: result.ok ? undefined : result.error,
    });
    if (result.ok) empresasOk++;
    else empresasFalha++;
  }

  return NextResponse.json({
    ok: true,
    hoje,
    elapsedMs: Date.now() - started,
    pagamentos: {
      vistos: pagamentosProcessados.length,
      ok: pagamentosOk,
      falha: pagamentosFalha,
      detalhes: pagamentosProcessados.slice(0, 40),
    },
    empresasVencidas: {
      candidatas: empresasVencidas.length,
      ok: empresasOk,
      falha: empresasFalha,
      detalhes: empresasProcessadas.slice(0, 40),
    },
  });
}
