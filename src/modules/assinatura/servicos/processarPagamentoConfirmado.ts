import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPayment,
  isPaymentConfirmed,
  parseAsaasBillingDate,
  type AsaasPayment,
} from '@/lib/asaas';
import { hojeYmd, toYmd } from '@/modules/assinatura';
import { aplicarPagamentoNoNovoCiclo } from './ativarPorPagamento';
import {
  buscarPagamentosConfirmadosAsaasEmpresa,
  paymentYmdFromAsaas,
  ultimoPagamentoConfirmadoAsaas,
} from './buscarPagamentosAsaas';
import { garantirPagamentoLocal } from './pagamentoLocal';
import { resolverEmpresaIdPorPagamentoAsaas } from './resolverEmpresa';

export type ProcessarPagamentoResult =
  | {
      ok: true;
      alreadyActive?: boolean;
      activated?: boolean;
      coberturaAte?: string;
      paymentId?: string;
    }
  | { ok: false; error: string; code?: string; coberturaAte?: string; paymentId?: string };

/**
 * Confirmação Asaas → libera assinatura no ciclo novo (dia 10 / pró-rata).
 * Liberação é imediata na mesma request do webhook.
 */
export async function processarPagamentoConfirmado(
  supabase: SupabaseClient,
  params: { asaasPaymentId: string; empresaId?: string | null; payment?: AsaasPayment | null }
): Promise<ProcessarPagamentoResult> {
  const asaasPaymentId = String(params.asaasPaymentId || '').trim();
  if (!asaasPaymentId) {
    return { ok: false, error: 'Parâmetros inválidos', code: 'invalid_params' };
  }
  if (asaasPaymentId.startsWith('mock_')) {
    return { ok: false, error: 'Pagamento simulado não ativa assinatura', code: 'mock_payment' };
  }

  let paymentAsaas = params.payment?.id === asaasPaymentId ? params.payment : null;
  if (!paymentAsaas) {
    try {
      paymentAsaas = await getPayment(asaasPaymentId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao consultar Asaas';
      return { ok: false, error: message, code: 'asaas_error' };
    }
  }

  if (!isPaymentConfirmed(paymentAsaas?.status || '', paymentAsaas?.paymentDate)) {
    return { ok: false, error: 'Pagamento ainda não confirmado no gateway', code: 'not_confirmed' };
  }

  let empresaId = String(params.empresaId || '').trim();
  if (!empresaId) {
    empresaId =
      (await resolverEmpresaIdPorPagamentoAsaas(supabase, asaasPaymentId, paymentAsaas)) || '';
  }
  if (!empresaId) {
    return {
      ok: false,
      error: 'Pagamento confirmado no Asaas, mas não foi possível identificar a empresa',
      code: 'pagamento_nao_vinculado',
      paymentId: asaasPaymentId,
    };
  }

  const paidAt =
    parseAsaasBillingDate(paymentAsaas.paymentDate) ??
    parseAsaasBillingDate(paymentAsaas.dueDate) ??
    new Date();
  const paymentYmd =
    toYmd(paymentAsaas.paymentDate) ||
    toYmd(paymentAsaas.dueDate) ||
    hojeYmd(paidAt);

  const { pagamento, error: pagErr } = await garantirPagamentoLocal(supabase, {
    empresaId,
    asaasPaymentId,
    valor: paymentAsaas.value,
    paidAtIso: paidAt.toISOString(),
    status: 'approved',
  });

  if (!pagamento?.id) {
    return {
      ok: false,
      error: pagErr || 'Não foi possível registrar o pagamento local',
      code: 'db_error',
      paymentId: asaasPaymentId,
    };
  }

  const result = await aplicarPagamentoNoNovoCiclo(supabase, {
    empresaId: String(pagamento.empresa_id || empresaId).trim() || empresaId,
    pagamento,
    gatewayPaymentId: asaasPaymentId,
    paymentYmd,
    paidAtIso: paidAt.toISOString(),
    valorAsaas: paymentAsaas.value,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, code: result.code, paymentId: asaasPaymentId };
  }

  return {
    ok: true,
    activated: !result.alreadyApplied,
    alreadyActive: result.alreadyApplied === true,
    coberturaAte: result.coberturaAte,
    paymentId: asaasPaymentId,
  };
}

/** Sync / “Já paguei”: aplica o último PIX confirmado no Asaas. */
export async function forcarLiberacaoPorUltimoPagamentoAsaas(
  supabase: SupabaseClient,
  empresaId: string
): Promise<ProcessarPagamentoResult> {
  const id = String(empresaId || '').trim();
  if (!id) return { ok: false, error: 'empresaId inválido', code: 'invalid_params' };

  const lista = await buscarPagamentosConfirmadosAsaasEmpresa(supabase, id);
  const ultimo = ultimoPagamentoConfirmadoAsaas(lista);
  if (!ultimo?.id) {
    return { ok: false, error: 'Nenhum pagamento confirmado encontrado', code: 'sem_pagamento' };
  }

  return processarPagamentoConfirmado(supabase, {
    asaasPaymentId: ultimo.id,
    empresaId: id,
  });
}

export { paymentYmdFromAsaas };
