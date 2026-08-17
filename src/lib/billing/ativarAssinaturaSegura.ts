import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPayment,
  isPaymentConfirmed,
  parseAsaasBillingDate,
  type AsaasPayment,
} from '@/lib/asaas';
import { aplicarPagamentoAssinatura } from '@/lib/billing/aplicarPagamentoAssinatura';
import { ativarAssinaturaPorPagamento } from '@/lib/billing/ativarAssinaturaPagamento';
import {
  buscarPagamentosConfirmadosAsaasEmpresa,
  paymentYmdFromAsaas,
  ultimoPagamentoConfirmadoAsaas,
} from '@/lib/billing/buscarPagamentosAsaasEmpresa';
import { garantirPagamentoLocal } from '@/lib/billing/garantirPagamentoLocal';
import { resolverEmpresaIdPorPagamentoAsaas } from '@/lib/billing/resolverEmpresaPagamentoAsaas';
import { activeRowCalendarValid } from '@/lib/billing/pickAssinatura';
import {
  isoToYmd,
  DIAS_ACESSO_PAGAMENTO,
  calcularCoberturaAposPagamento,
} from '@/lib/billing/calcularCoberturaPagamento';
import { getCoberturaAteYmd, coberturaYmdParaIso } from '@/lib/billing/coberturaAssinatura';

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

function hojeYmdBrasil(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return toYmd(new Date());
  }
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Ativa/renova assinatura após pagamento confirmado no Asaas.
 * Não exige linha local prévia: cria o vínculo e libera.
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
    isoToYmd(paymentAsaas.paymentDate) ||
    isoToYmd(paymentAsaas.dueDate) ||
    toYmd(paidAt);

  const { pagamento, error: pagErr } = await garantirPagamentoLocal(supabase, {
    empresaId,
    asaasPaymentId,
    valor: paymentAsaas.value,
    paidAtIso: paidAt.toISOString(),
    status: 'approved',
  });

  if (pagamento?.id) {
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

  console.warn('processarPagamentoConfirmado: sem linha local, ativando mesmo assim', {
    asaasPaymentId,
    empresaId,
    pagErr,
  });

  const { data: assinaturaAtual } = await supabase
    .from('assinaturas')
    .select('id, data_fim, proxima_cobranca, observacoes')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payMarker = `[pay:${asaasPaymentId}]`;
  if (String(assinaturaAtual?.observacoes || '').includes(payMarker)) {
    const coberturaAte =
      getCoberturaAteYmd(assinaturaAtual) || paymentYmd;
    return {
      ok: true,
      alreadyActive: true,
      activated: true,
      coberturaAte,
      paymentId: asaasPaymentId,
    };
  }

  const coberturaAtual = getCoberturaAteYmd(assinaturaAtual);
  const { coberturaYmd, dataFimIso, adiantou } = calcularCoberturaAposPagamento({
    dataPagamentoYmd: paymentYmd,
    coberturaAtualYmd: coberturaAtual,
  });

  const ativou = await ativarAssinaturaPorPagamento(
    supabase,
    empresaId,
    paidAt.toISOString(),
    new Date(dataFimIso),
    null,
    {
      observacaoExtra: [
        pagErr ? `(pagamentos: ${pagErr})` : 'sem linha em pagamentos',
        adiantou ? `(adiantamento: +${DIAS_ACESSO_PAGAMENTO}d a partir de ${coberturaAtual})` : '',
      ]
        .filter(Boolean)
        .join(' '),
      gatewayPaymentId: asaasPaymentId,
    }
  );

  if (!ativou) {
    return {
      ok: false,
      error: pagErr
        ? `Falha ao gravar pagamento (${pagErr}) e ao atualizar assinatura`
        : 'Falha ao atualizar assinatura',
      code: 'ativacao_falhou',
      paymentId: asaasPaymentId,
    };
  }

  return {
    ok: true,
    activated: true,
    coberturaAte: coberturaYmd,
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
 * Libera pelo último pagamento confirmado no Asaas, sem empilhar histórico.
 * Se a cobertura estiver inflada (vários PIX antigos aplicados de uma vez), recorta para pagamento+30.
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

  const hoje = hojeYmdBrasil();
  const paymentYmd = paymentYmdFromAsaas(latest, hoje);
  const alvo = addDaysYmd(paymentYmd, DIAS_ACESSO_PAGAMENTO);
  const maxLegitimo = addDaysYmd(paymentYmd, DIAS_ACESSO_PAGAMENTO * 2);

  const { data: assinaturaAtual } = await supabase
    .from('assinaturas')
    .select('id, data_fim, proxima_cobranca, observacoes')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const atual = getCoberturaAteYmd(assinaturaAtual);
  let coberturaFinal = alvo;
  if (atual && atual >= hoje && atual <= maxLegitimo) {
    coberturaFinal = atual;
  }

  const paidAt =
    parseAsaasBillingDate(latest.paymentDate) ??
    parseAsaasBillingDate(latest.dueDate) ??
    new Date();

  await garantirPagamentoLocal(supabase, {
    empresaId,
    asaasPaymentId: latest.id,
    valor: latest.value,
    paidAtIso: paidAt.toISOString(),
    status: 'approved',
  });

  const ativou = await ativarAssinaturaPorPagamento(
    supabase,
    empresaId,
    paidAt.toISOString(),
    new Date(coberturaYmdParaIso(coberturaFinal)),
    null,
    {
      observacaoExtra:
        atual && atual > maxLegitimo
          ? '(cobertura recortada para o último pagamento Asaas)'
          : null,
      gatewayPaymentId: latest.id,
    }
  );

  if (!ativou) {
    return {
      ok: false,
      error: 'Pagamento confirmado, mas falha ao atualizar assinatura',
      code: 'ativacao_falhou',
      paymentId: latest.id,
    };
  }

  return {
    ok: true,
    activated: true,
    alreadyActive: atual === coberturaFinal && atual != null && atual >= hoje,
    coberturaAte: coberturaFinal,
    paymentId: latest.id,
  };
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
