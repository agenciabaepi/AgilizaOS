import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPayment,
  isPaymentConfirmed,
  listCustomersByEmail,
  listPaymentsByCustomer,
  parseAsaasBillingDate,
  pickLatestConfirmedAsaasPayment,
} from '@/lib/asaas';
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
  if (!isPaymentConfirmed(statusAsaas, paymentAsaas?.paymentDate)) {
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

/**
 * Reparo forte: usa cobranças locais + Asaas (e-mail da empresa).
 * Garante vínculo local e ativa a assinatura no último pagamento confirmado.
 * Usar em sincronizar e ao carregar /api/assinatura/minha quando ainda bloqueado.
 */
export async function repararAssinaturaComAsaas(
  supabase: SupabaseClient,
  empresaId: string
): Promise<ProcessarPagamentoResult> {
  // 1) Tentativa rápida pelas cobranças já no banco
  const local = await reconciliarPagamentosPendentesEmpresa(supabase, empresaId);
  if (local.ok) return local;

  // 2) Liberação forçada pelo último pagamento confirmado no Asaas
  const forced = await forcarLiberacaoPorUltimoPagamentoAsaas(supabase, empresaId);
  if (forced.ok) return forced;

  return local.ok ? local : forced;
}

/** YYYY-MM-DD em UTC (alinha com parseAsaasBillingDate meio-dia UTC). */
function toYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toYmdUtc(dt);
}

function hojeYmdUtc(): string {
  // Dia civil em São Paulo (evita liberar/bloquear no fuso errado perto da meia-noite)
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return toYmdUtc(new Date());
  }
}

/**
 * Liberação definitiva: pega o último pagamento confirmado no Asaas (e-mail ou IDs locais)
 * e grava `active` + proxima_cobranca/data_fim = pago + 30 dias.
 * Não depende de status local "approved" prévio.
 */
export async function forcarLiberacaoPorUltimoPagamentoAsaas(
  supabase: SupabaseClient,
  empresaId: string
): Promise<ProcessarPagamentoResult & { coberturaAte?: string; paymentId?: string }> {
  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, email, created_at, dias_trial')
    .eq('id', empresaId)
    .maybeSingle();

  if (!empresa) {
    return { ok: false, error: 'Empresa não encontrada', code: 'empresa_nao_encontrada' };
  }

  type Cand = { id: string; paymentDate?: string; dueDate?: string; value?: number };
  const byId = new Map<string, Cand>();

  // 1) IDs já salvos no banco
  const { data: locais } = await supabase
    .from('pagamentos')
    .select('mercadopago_payment_id')
    .eq('empresa_id', empresaId)
    .not('mercadopago_payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);

  for (const row of locais || []) {
    const id = String(row.mercadopago_payment_id || '').trim();
    if (!id || id.startsWith('mock_')) continue;
    try {
      const p = await getPayment(id);
      if (p?.id && isPaymentConfirmed(p.status || '', p.paymentDate)) {
        byId.set(p.id, {
          id: p.id,
          paymentDate: p.paymentDate,
          dueDate: p.dueDate,
          value: p.value,
        });
      }
    } catch {
      /* ignore */
    }
  }

  // 2) Clientes Asaas pelo e-mail da empresa
  const email = typeof empresa.email === 'string' ? empresa.email.trim() : '';
  if (email) {
    try {
      const customers = await listCustomersByEmail(email);
      for (const c of customers) {
        const payments = await listPaymentsByCustomer(c.id);
        for (const p of payments) {
          if (!p?.id || !isPaymentConfirmed(p.status || '', p.paymentDate)) continue;
          byId.set(p.id, {
            id: p.id,
            paymentDate: p.paymentDate,
            dueDate: p.dueDate,
            value: p.value,
          });
        }
      }
    } catch (e) {
      console.warn('forcarLiberacao: listCustomersByEmail falhou', e);
    }
  }

  const candidatos = [...byId.values()].sort((a, b) => {
    const da = a.paymentDate || a.dueDate || '';
    const db = b.paymentDate || b.dueDate || '';
    return String(db).localeCompare(String(da));
  });

  const latest = candidatos[0];
  if (!latest) {
    return {
      ok: false,
      error:
        email
          ? `Nenhum pagamento confirmado no Asaas para ${email}`
          : 'Nenhum pagamento confirmado no Asaas (empresa sem e-mail)',
      code: 'sem_pagamento_asaas',
    };
  }

  const baseYmd =
    (latest.paymentDate && /^\d{4}-\d{2}-\d{2}/.test(latest.paymentDate)
      ? latest.paymentDate.slice(0, 10)
      : null) ||
    (latest.dueDate && /^\d{4}-\d{2}-\d{2}/.test(latest.dueDate)
      ? latest.dueDate.slice(0, 10)
      : null) ||
    hojeYmdUtc();

  const coberturaYmd = addDaysYmd(baseYmd, DIAS_ACESSO_PAGAMENTO);
  const dataInicio =
    parseAsaasBillingDate(latest.paymentDate) ??
    parseAsaasBillingDate(latest.dueDate) ??
    new Date();
  const nowIso = dataInicio.toISOString();
  const dataFimIso = `${coberturaYmd}T12:00:00.000Z`;
  const dataFim = new Date(dataFimIso);

  // Cobertura já no passado? Não liberar com pagamento antigo
  if (coberturaYmd < hojeYmdUtc()) {
    return {
      ok: false,
      error: `Último pagamento Asaas cobre só até ${coberturaYmd} (já passou)`,
      code: 'cobertura_expirada',
      coberturaAte: coberturaYmd,
      paymentId: latest.id,
    };
  }

  // Garante linha local approved (necessário para assinaturaAtivaTemDireito)
  const { data: pagLocal } = await supabase
    .from('pagamentos')
    .select('id, plano_slug')
    .eq('mercadopago_payment_id', latest.id)
    .maybeSingle();

  const planoSlug: string | null = (pagLocal?.plano_slug as string | null) ?? null;
  if (!pagLocal?.id) {
    await supabase.from('pagamentos').insert({
      empresa_id: empresaId,
      mercadopago_payment_id: latest.id,
      status: 'approved',
      valor: Number(latest.value) || 0,
      paid_at: nowIso,
    });
  } else {
    await supabase
      .from('pagamentos')
      .update({
        status: 'approved',
        paid_at: nowIso,
        valor: Number(latest.value) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pagLocal.id);
  }

  // Ativação "oficial" (plano / arquivar trials)
  await ativarAssinaturaPorPagamento(supabase, empresaId, nowIso, dataFim, planoSlug);

  // Nuclear: sempre grava datas na(s) assinatura(s) da empresa — não confiar só no caminho acima
  const payloadAssinatura = {
    status: 'active' as const,
    data_fim: dataFimIso,
    proxima_cobranca: dataFimIso,
    data_trial_fim: null,
    updated_at: new Date().toISOString(),
    observacoes: `[auto] Liberação forçada pelo pagamento Asaas ${latest.id} (cobertura até ${coberturaYmd})`,
  };

  const { data: rowsUpd, error: updErr } = await supabase
    .from('assinaturas')
    .update(payloadAssinatura)
    .eq('empresa_id', empresaId)
    .in('status', ['active', 'ativa', 'expired', 'trial', 'cancelled', 'pending_payment', 'suspended'])
    .select('id');

  if (updErr || !rowsUpd?.length) {
    const { error: insErr } = await supabase.from('assinaturas').insert({
      empresa_id: empresaId,
      status: 'active',
      data_inicio: nowIso,
      data_fim: dataFimIso,
      proxima_cobranca: dataFimIso,
      valor: Number(latest.value) || 0,
      observacoes: `[auto] Liberação forçada (insert) pagamento ${latest.id}`,
    });
    if (insErr) {
      return {
        ok: false,
        error: insErr.message || updErr?.message || 'Falha ao gravar assinatura',
        code: 'ativacao_falhou',
        paymentId: latest.id,
      };
    }
  }

  // Confirma leitura: se ainda estiver no passado, falha explícita
  const { data: checkRows } = await supabase
    .from('assinaturas')
    .select('id, status, proxima_cobranca, data_fim')
    .eq('empresa_id', empresaId)
    .order('updated_at', { ascending: false })
    .limit(5);

  const okRow = (checkRows || []).find((r) => {
    const prox = String(r.proxima_cobranca || r.data_fim || '').slice(0, 10);
    return r.status === 'active' && prox >= coberturaYmd.slice(0, 10);
  });

  if (!okRow) {
    return {
      ok: false,
      error: 'Pagamento encontrado, mas a assinatura no banco não atualizou. Verifique permissões/RLS do service role.',
      code: 'ativacao_nao_persistiu',
      coberturaAte: coberturaYmd,
      paymentId: latest.id,
    };
  }

  return {
    ok: true,
    activated: true,
    coberturaAte: coberturaYmd,
    paymentId: latest.id,
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
  if (String(assinatura.status) !== 'active' && String(assinatura.status) !== 'ativa') return true;

  const obs = String(assinatura.observacoes || '').toLowerCase();
  if (obs.includes('pelo admin') || obs.includes('concedida pelo admin')) {
    return true;
  }

  // Se a cobertura ainda é válida no calendário, não derruba
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

  // NUNCA reverter se ainda há cobertura futura válida
  if (activeRowCalendarValid(assinatura) && (assinatura.data_fim || assinatura.proxima_cobranca)) {
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
