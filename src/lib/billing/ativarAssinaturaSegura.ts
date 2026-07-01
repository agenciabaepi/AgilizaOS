import type { SupabaseClient } from '@supabase/supabase-js';
import { getPayment, isPaymentConfirmed, parseAsaasBillingDate } from '@/lib/asaas';
import { ativarAssinaturaPorPagamento } from '@/lib/billing/ativarAssinaturaPagamento';
import { confirmarCupomUso } from '@/lib/billing/cupomServer';
import { activeRowCalendarValid } from '@/lib/billing/pickAssinatura';

export const DIAS_ACESSO_PAGAMENTO = 30;

const VALOR_TOLERANCIA = 0.05;

export type ProcessarPagamentoResult =
  | { ok: true; alreadyActive?: boolean }
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
  return Math.abs(valorPagamento - valorAsaas) <= VALOR_TOLERANCIA;
}

/**
 * Único caminho para ativar/renovar assinatura após PIX.
 * Exige cobrança registrada em `pagamentos` + confirmação no Asaas para o mesmo ID.
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

  if (row.status === 'approved' && row.paid_at) {
    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('id, status, data_fim, proxima_cobranca')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assinatura && activeRowCalendarValid(assinatura as Record<string, unknown>)) {
      return { ok: true, alreadyActive: true };
    }
  }

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

  const valorLocal = Number(row.valor ?? 0);
  const valorAsaas = Number(paymentAsaas.value ?? 0);
  if (!valoresCompativeis(valorLocal, valorAsaas)) {
    return {
      ok: false,
      error: 'Valor da cobrança não confere com o pagamento confirmado',
      code: 'valor_divergente',
    };
  }

  const dataInicio =
    parseAsaasBillingDate(paymentAsaas.paymentDate) ??
    parseAsaasBillingDate(paymentAsaas.dueDate) ??
    new Date();
  const dataFim = new Date(dataInicio);
  dataFim.setDate(dataFim.getDate() + DIAS_ACESSO_PAGAMENTO);
  const nowIso = dataInicio.toISOString();

  const { error: updatePagamentoErr } = await supabase
    .from('pagamentos')
    .update({
      status: 'approved',
      paid_at: nowIso,
      valor: valorAsaas,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('empresa_id', empresaId);

  if (updatePagamentoErr) {
    return { ok: false, error: updatePagamentoErr.message, code: 'update_pagamento' };
  }

  if (row.cupom_uso_id) {
    await confirmarCupomUso(supabase, row.cupom_uso_id, row.id);
  }

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
      error: 'Pagamento confirmado, mas falha ao atualizar assinatura',
      code: 'ativacao_falhou',
    };
  }

  return { ok: true };
}

/**
 * Reconcilia apenas cobranças locais pendentes da empresa (nunca busca “qualquer PIX” por e-mail).
 */
export async function reconciliarPagamentosPendentesEmpresa(
  supabase: SupabaseClient,
  empresaId: string
): Promise<ProcessarPagamentoResult> {
  const { data: pendentes, error } = await supabase
    .from('pagamentos')
    .select('mercadopago_payment_id')
    .eq('empresa_id', empresaId)
    .not('mercadopago_payment_id', 'is', null)
    .neq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return { ok: false, error: error.message, code: 'db_error' };
  }

  if (!pendentes?.length) {
    return {
      ok: false,
      error: 'Nenhuma cobrança pendente encontrada para esta empresa',
      code: 'sem_pendentes',
    };
  }

  for (const p of pendentes) {
    const paymentId = p.mercadopago_payment_id;
    if (!paymentId || String(paymentId).startsWith('mock_')) continue;

    const result = await processarPagamentoConfirmado(supabase, {
      asaasPaymentId: String(paymentId),
      empresaId,
    });

    if (result.ok) return result;
    if (result.code !== 'not_confirmed' && result.code !== 'asaas_error') {
      return result;
    }
  }

  return {
    ok: false,
    error: 'Nenhum pagamento pendente foi confirmado no gateway',
    code: 'not_confirmed',
  };
}

/** Assinatura `active` só é válida com pagamento aprovado, liberação admin ou observação de concessão admin. */
export async function assinaturaAtivaTemDireito(
  supabase: SupabaseClient,
  empresaId: string,
  assinatura: Record<string, unknown>,
  sistemaLiberado: boolean
): Promise<boolean> {
  if (sistemaLiberado) return true;
  if (String(assinatura.status) !== 'active') return true;

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
  if (String(assinatura.status) !== 'active') return assinatura;

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
