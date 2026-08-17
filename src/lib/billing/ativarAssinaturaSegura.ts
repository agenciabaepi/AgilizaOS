import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPayment,
  isPaymentConfirmed,
  parseAsaasBillingDate,
} from '@/lib/asaas';
import { aplicarPagamentoAssinatura } from '@/lib/billing/aplicarPagamentoAssinatura';
import {
  buscarPagamentosConfirmadosAsaasEmpresa,
  ultimoPagamentoConfirmadoAsaas,
} from '@/lib/billing/buscarPagamentosAsaasEmpresa';
import { garantirPagamentoLocal } from '@/lib/billing/garantirPagamentoLocal';
import { resolverEmpresaIdPorPagamentoAsaas } from '@/lib/billing/resolverEmpresaPagamentoAsaas';
import { activeRowCalendarValid } from '@/lib/billing/pickAssinatura';
import { isoToYmd, DIAS_ACESSO_PAGAMENTO } from '@/lib/billing/calcularCoberturaPagamento';

export { DIAS_ACESSO_PAGAMENTO };

export type ProcessarPagamentoResult =
  | { ok: true; alreadyActive?: boolean; activated?: boolean; coberturaAte?: string; paymentId?: string }
  | { ok: false; error: string; code?: string; coberturaAte?: string; paymentId?: string };

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Ativa/renova assinatura após pagamento confirmado no Asaas.
 * Não exige linha local prévia: cria o vínculo e libera.
 */
export async function processarPagamentoConfirmado(
  supabase: SupabaseClient,
  params: { asaasPaymentId: string; empresaId?: string | null }
): Promise<ProcessarPagamentoResult> {
  const asaasPaymentId = String(params.asaasPaymentId || '').trim();
  if (!asaasPaymentId) {
    return { ok: false, error: 'Parâmetros inválidos', code: 'invalid_params' };
  }
  if (asaasPaymentId.startsWith('mock_')) {
    return { ok: false, error: 'Pagamento simulado não ativa assinatura', code: 'mock_payment' };
  }

  let paymentAsaas;
  try {
    paymentAsaas = await getPayment(asaasPaymentId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar Asaas';
    return { ok: false, error: message, code: 'asaas_error' };
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
    isoToYmd(paymentAsaas.paymentDate) ||
    isoToYmd(paymentAsaas.dueDate) ||
    toYmd(paidAt);

  const pagamento = await garantirPagamentoLocal(supabase, {
    empresaId,
    asaasPaymentId,
    valor: paymentAsaas.value,
    paidAtIso: paidAt.toISOString(),
    status: 'approved',
  });

  if (!pagamento?.id) {
    return {
      ok: false,
      error: 'Falha ao gravar o pagamento local para liberar a assinatura',
      code: 'db_error',
      paymentId: asaasPaymentId,
    };
  }

  const empresaAlvo = String(pagamento.empresa_id || empresaId).trim() || empresaId;

  const result = await aplicarPagamentoAssinatura(supabase, {
    empresaId: empresaAlvo,
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
    activated: result.activated,
    alreadyActive: result.alreadyApplied,
    coberturaAte: result.coberturaAte,
    paymentId: asaasPaymentId,
  };
}

export async function reconciliarPagamentosPendentesEmpresa(
  supabase: SupabaseClient,
  empresaId: string
): Promise<ProcessarPagamentoResult> {
  const { data: candidatos, error } = await supabase
    .from('pagamentos')
    .select('mercadopago_payment_id, status, created_at')
    .eq('empresa_id', empresaId)
    .not('mercadopago_payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { ok: false, error: error.message, code: 'db_error' };
  if (!candidatos?.length) {
    return { ok: false, error: 'Nenhuma cobrança encontrada para esta empresa', code: 'sem_pendentes' };
  }

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
    if (result.code === 'not_confirmed' || result.code === 'asaas_error') {
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

export async function repararAssinaturaComAsaas(
  supabase: SupabaseClient,
  empresaId: string
): Promise<ProcessarPagamentoResult> {
  const local = await reconciliarPagamentosPendentesEmpresa(supabase, empresaId);
  if (local.ok) return local;
  return forcarLiberacaoPorUltimoPagamentoAsaas(supabase, empresaId);
}

/**
 * Garante vínculo local e aplica o último pagamento confirmado no Asaas.
 * Usado pelo botão "Atualizar" e reparos administrativos.
 */
export async function forcarLiberacaoPorUltimoPagamentoAsaas(
  supabase: SupabaseClient,
  empresaId: string
): Promise<ProcessarPagamentoResult> {
  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, email')
    .eq('id', empresaId)
    .maybeSingle();

  if (!empresa) {
    return { ok: false, error: 'Empresa não encontrada', code: 'empresa_nao_encontrada' };
  }

  const confirmados = await buscarPagamentosConfirmadosAsaasEmpresa(supabase, empresaId);
  const latest = ultimoPagamentoConfirmadoAsaas(confirmados);
  if (!latest) {
    const email = typeof empresa.email === 'string' ? empresa.email.trim() : '';
    return {
      ok: false,
      error: email
        ? `Nenhum pagamento confirmado no Asaas para ${email}`
        : 'Nenhum pagamento confirmado no Asaas (empresa sem e-mail)',
      code: 'sem_pagamento_asaas',
    };
  }

  return processarPagamentoConfirmado(supabase, {
    asaasPaymentId: latest.id,
    empresaId,
  });
}

export async function assinaturaAtivaTemDireito(
  supabase: SupabaseClient,
  empresaId: string,
  assinatura: Record<string, unknown>,
  sistemaLiberado: boolean
): Promise<boolean> {
  if (sistemaLiberado) return true;
  if (String(assinatura.status) !== 'active' && String(assinatura.status) !== 'ativa') return true;

  const obs = String(assinatura.observacoes || '').toLowerCase();
  if (obs.includes('pelo admin') || obs.includes('concedida pelo admin')) return true;

  if (activeRowCalendarValid(assinatura) && (assinatura.data_fim || assinatura.proxima_cobranca)) {
    return true;
  }

  const { data: pagos, error } = await supabase
    .from('pagamentos')
    .select('id, status')
    .eq('empresa_id', empresaId)
    .limit(50);

  if (error) {
    console.warn('assinaturaAtivaTemDireito:', error.message);
    return false;
  }

  return (pagos || []).some((p) => {
    const s = String(p.status || '').toLowerCase();
    return ['approved', 'confirmed', 'received', 'pago'].includes(s);
  });
}

export async function corrigirAssinaturaAtivaIndevida(
  supabase: SupabaseClient,
  empresaId: string,
  assinatura: Record<string, unknown>,
  sistemaLiberado: boolean
): Promise<Record<string, unknown>> {
  if (String(assinatura.status) !== 'active' && String(assinatura.status) !== 'ativa') {
    return assinatura;
  }
  if (activeRowCalendarValid(assinatura) && (assinatura.data_fim || assinatura.proxima_cobranca)) {
    return assinatura;
  }

  const temDireito = await assinaturaAtivaTemDireito(supabase, empresaId, assinatura, sistemaLiberado);
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

  return { ...assinatura, status: 'expired', data_fim: agora, proxima_cobranca: null };
}
