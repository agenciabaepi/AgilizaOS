import type { SupabaseClient } from '@supabase/supabase-js';
import { getPayment, isPaymentConfirmed, parseAsaasBillingDate } from '@/lib/asaas';
import { ativarAssinaturaPorPagamento } from '@/lib/billing/ativarAssinaturaPagamento';
import { confirmarCupomUso } from '@/lib/billing/cupomServer';
import { activeRowCalendarValid } from '@/lib/billing/pickAssinatura';

export const DIAS_ACESSO_PAGAMENTO = 30;

export type ProcessarPagamentoResult =
  | { ok: true; alreadyActive?: boolean; activated?: boolean }
  | { ok: false; error: string; code?: string };

type PagamentoRow = {
  id: string;
  empresa_id: string;
  mercadopago_payment_id: string | null;
  status: string | null;
  valor: number | null;
  paid_at: string | null;
  plano_slug: string | null;
  cupom_uso_id: string | null;
};

function valoresCompativeis(valorPagamento: number, valorAsaas: number): boolean {
  if (!Number.isFinite(valorPagamento) || !Number.isFinite(valorAsaas)) return false;
  // Tolerância maior: cupom / arredondamento não podem impedir liberação
  return Math.abs(valorPagamento - valorAsaas) <= 1.0;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function maxCoberturaYmd(assinatura: {
  data_fim?: string | null;
  proxima_cobranca?: string | null;
}): string | null {
  const dates = [assinatura.data_fim, assinatura.proxima_cobranca]
    .filter(Boolean)
    .map((iso) => {
      const d = new Date(String(iso));
      return Number.isNaN(d.getTime()) ? null : toYmd(d);
    })
    .filter(Boolean) as string[];
  if (!dates.length) return null;
  return dates.sort().at(-1) ?? null;
}

/**
 * Assinatura só está "já ativa" para este pagamento se:
 * - status active
 * - tem data de cobertura
 * - cobertura civil >= fim deste pagamento (pago + 30)
 */
function assinaturaJaCobrePagamento(
  assinatura: Record<string, unknown> | null,
  coberturaPagamentoYmd: string
): boolean {
  if (!assinatura) return false;
  const status = String(assinatura.status || '');
  if (status !== 'active' && status !== 'ativa') return false;
  if (!activeRowCalendarValid(assinatura)) return false;
  if (!assinatura.data_fim && !assinatura.proxima_cobranca) return false;
  const cob = maxCoberturaYmd({
    data_fim: assinatura.data_fim as string | null,
    proxima_cobranca: assinatura.proxima_cobranca as string | null,
  });
  if (!cob) return false;
  return cob >= coberturaPagamentoYmd;
}

/**
 * Único caminho para ativar/renovar assinatura após PIX.
 * Ordem crítica: ativar assinatura PRIMEIRO, só então marcar pagamento approved.
 * Assim, se a ativação falhar, sincronizar ainda consegue retentar.
 */
export async function processarPagamentoConfirmado(
  supabase: SupabaseClient,
  params: {
    asaasPaymentId: string;
    empresaId: string;
  }
): Promise<ProcessarPagamentoResult> {
  const asaasPaymentId = String(params.asaasPaymentId || '').trim();
  const empresaId = String(params.empresaId || '').trim();

  if (!asaasPaymentId || !empresaId) {
    return { ok: false, error: 'Parâmetros inválidos', code: 'invalid_params' };
  }

  if (asaasPaymentId.startsWith('mock_')) {
    return { ok: false, error: 'Pagamento simulado não ativa assinatura', code: 'mock_payment' };
  }

  const { data: pagamento, error: pagamentoErr } = await supabase
    .from('pagamentos')
    .select('id, empresa_id, mercadopago_payment_id, status, valor, paid_at, plano_slug, cupom_uso_id')
    .eq('mercadopago_payment_id', asaasPaymentId)
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (pagamentoErr) {
    return { ok: false, error: pagamentoErr.message, code: 'db_error' };
  }

  if (!pagamento?.id) {
    return {
      ok: false,
      error: 'Cobrança não vinculada a esta empresa. Assinatura não pode ser ativada.',
      code: 'pagamento_nao_vinculado',
    };
  }

  const row = pagamento as PagamentoRow;

  let paymentAsaas;
  try {
    paymentAsaas = await getPayment(asaasPaymentId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar Asaas';
    return { ok: false, error: message, code: 'asaas_error' };
  }

  const statusAsaas = paymentAsaas?.status || '';
  if (!isPaymentConfirmed(statusAsaas)) {
    return {
      ok: false,
      error: 'Pagamento ainda não confirmado no gateway',
      code: 'not_confirmed',
    };
  }

  const dataInicio =
    parseAsaasBillingDate(paymentAsaas.paymentDate) ??
    parseAsaasBillingDate(paymentAsaas.dueDate) ??
    (row.paid_at ? new Date(row.paid_at) : new Date());
  const dataFim = new Date(dataInicio);
  dataFim.setDate(dataFim.getDate() + DIAS_ACESSO_PAGAMENTO);
  const coberturaYmd = toYmd(dataFim);
  const nowIso = dataInicio.toISOString();

  const { data: assinaturaAtual } = await supabase
    .from('assinaturas')
    .select('id, status, data_fim, proxima_cobranca')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assinaturaJaCobrePagamento(assinaturaAtual as Record<string, unknown> | null, coberturaYmd)) {
    // Garante status local alinhado
    if (row.status !== 'approved') {
      await supabase
        .from('pagamentos')
        .update({
          status: 'approved',
          paid_at: row.paid_at || nowIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('empresa_id', empresaId);
    }
    return { ok: true, alreadyActive: true, activated: true };
  }

  const valorLocal = Number(row.valor ?? 0);
  const valorAsaas = Number(paymentAsaas.value ?? 0);
  if (valorLocal > 0 && valorAsaas > 0 && !valoresCompativeis(valorLocal, valorAsaas)) {
    console.warn(
      `processarPagamentoConfirmado: valor diverge local=${valorLocal} asaas=${valorAsaas} — seguindo com valor Asaas`
    );
  }

  // 1) Ativar assinatura ANTES de marcar approved (permite retry se falhar)
  const ativou = await ativarAssinaturaPorPagamento(
    supabase,
    empresaId,
    nowIso,
    dataFim,
    row.plano_slug
  );

  if (!ativou) {
    return {
      ok: false,
      error: 'Pagamento confirmado no Asaas, mas falha ao atualizar assinatura',
      code: 'ativacao_falhou',
    };
  }

  // 2) Só então marca pagamento como approved
  const { error: updatePagamentoErr } = await supabase
    .from('pagamentos')
    .update({
      status: 'approved',
      paid_at: nowIso,
      valor: Number.isFinite(valorAsaas) && valorAsaas > 0 ? valorAsaas : valorLocal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('empresa_id', empresaId);

  if (updatePagamentoErr) {
    // Assinatura já liberada — não falhar o fluxo por isso
    console.warn('processarPagamentoConfirmado: assinatura ok, falha ao marcar pagamento:', updatePagamentoErr);
  }

  if (row.cupom_uso_id) {
    await confirmarCupomUso(supabase, row.cupom_uso_id, row.id);
  }

  return { ok: true, activated: true };
}

/**
 * Reconcilia cobranças da empresa com o Asaas e garante assinatura liberada.
 * Inclui:
 * - pendentes (PENDING etc.)
 * - approved locais cuja assinatura ainda está vencida/atrasada (retry)
 */
export async function reconciliarPagamentosPendentesEmpresa(
  supabase: SupabaseClient,
  empresaId: string
): Promise<ProcessarPagamentoResult> {
  const { data: candidatos, error } = await supabase
    .from('pagamentos')
    .select('mercadopago_payment_id, status, paid_at, created_at')
    .eq('empresa_id', empresaId)
    .not('mercadopago_payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return { ok: false, error: error.message, code: 'db_error' };
  }

  if (!candidatos?.length) {
    return {
      ok: false,
      error: 'Nenhuma cobrança encontrada para esta empresa',
      code: 'sem_pendentes',
    };
  }

  // Prioriza mais recentes; tenta pending primeiro, depois approved (retry)
  const ordenados = [...candidatos].sort((a, b) => {
    const aPending = String(a.status || '').toLowerCase() !== 'approved' ? 0 : 1;
    const bPending = String(b.status || '').toLowerCase() !== 'approved' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  let lastError: ProcessarPagamentoResult | null = null;

  for (const p of ordenados) {
    const paymentId = p.mercadopago_payment_id;
    if (!paymentId || String(paymentId).startsWith('mock_')) continue;

    const result = await processarPagamentoConfirmado(supabase, {
      asaasPaymentId: String(paymentId),
      empresaId,
    });

    if (result.ok) return result;

    // Continua tentando outros se só "ainda não confirmado"
    if (result.code === 'not_confirmed' || result.code === 'asaas_error') {
      lastError = result;
      continue;
    }
    // Divergência / vínculo: tenta próximo
    if (result.code === 'valor_divergente' || result.code === 'pagamento_nao_vinculado') {
      lastError = result;
      continue;
    }
    lastError = result;
  }

  return (
    lastError || {
      ok: false,
      error: 'Nenhum pagamento confirmado no gateway para liberar a assinatura',
      code: 'not_confirmed',
    }
  );
}

/** Assinatura `active` só é válida com pagamento aprovado, liberação admin ou observação de concessão admin. */
export async function assinaturaAtivaTemDireito(
  supabase: SupabaseClient,
  empresaId: string,
  assinatura: Record<string, unknown>,
  sistemaLiberado: boolean
): Promise<boolean> {
  if (sistemaLiberado) return true;
  if (String(assinatura.status) !== 'active' && String(assinatura.status) !== 'ativa') return true;

  const obs = String(assinatura.observacoes || '').toLowerCase();
  if (obs.includes('pelo admin') || obs.includes('concedida pelo admin')) {
    return true;
  }

  const { count, error } = await supabase
    .from('pagamentos')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('status', 'approved');

  if (error) {
    console.warn('assinaturaAtivaTemDireito:', error.message);
    return false;
  }

  return (count ?? 0) > 0;
}

/** Corrige assinatura ativa sem direito (auto-ativação indevida). */
export async function corrigirAssinaturaAtivaIndevida(
  supabase: SupabaseClient,
  empresaId: string,
  assinatura: Record<string, unknown>,
  sistemaLiberado: boolean
): Promise<Record<string, unknown>> {
  if (String(assinatura.status) !== 'active' && String(assinatura.status) !== 'ativa') {
    return assinatura;
  }

  const temDireito = await assinaturaAtivaTemDireito(
    supabase,
    empresaId,
    assinatura,
    sistemaLiberado
  );

  if (temDireito) return assinatura;

  const agora = new Date().toISOString();
  const id = assinatura.id as string | undefined;

  if (id) {
    await supabase
      .from('assinaturas')
      .update({
        status: 'expired',
        data_fim: agora,
        proxima_cobranca: null,
        updated_at: agora,
        observacoes: `${String(assinatura.observacoes || '').trim()} [auto] Revertida: ativação sem pagamento confirmado.`.trim(),
      })
      .eq('id', id)
      .eq('empresa_id', empresaId);
  }

  return {
    ...assinatura,
    status: 'expired',
    data_fim: agora,
    proxima_cobranca: null,
  };
}
