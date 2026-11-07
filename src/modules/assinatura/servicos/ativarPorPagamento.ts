import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANO_SLUGS } from '@/config/planModules';
import {
  calcularRenovacaoAposPagamento,
  hojeYmd,
  toYmd,
  type TipoCobranca,
} from '@/modules/assinatura';
import { marcarPagamentoAplicado, type PagamentoLocalRow } from './pagamentoLocal';

async function resolverPlanoId(
  supabase: SupabaseClient,
  empresaId: string,
  planoSlug?: string | null
): Promise<{ planoId: string; valor: number } | null> {
  const slug =
    planoSlug === PLANO_SLUGS.BASICO || planoSlug === PLANO_SLUGS.COMPLETO
      ? planoSlug
      : null;

  if (slug) {
    const { data } = await supabase
      .from('planos')
      .select('id, preco')
      .eq('slug', slug)
      .eq('ativo', true)
      .maybeSingle();
    if (data?.id) return { planoId: data.id, valor: Number(data.preco) || 0 };
  }

  const { data: rows } = await supabase
    .from('assinaturas')
    .select('plano_id, status, valor')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(10);

  for (const row of rows || []) {
    const st = String(row.status || '').toLowerCase();
    if (st === 'cancelled' || st === 'trial' || !row.plano_id) continue;
    const { data: plano } = await supabase
      .from('planos')
      .select('id, preco, slug')
      .eq('id', row.plano_id)
      .maybeSingle();
    if (plano?.id) {
      const valorAtual = Number(row.valor);
      return {
        planoId: plano.id,
        valor: Number.isFinite(valorAtual) && valorAtual > 0 ? valorAtual : Number(plano.preco) || 0,
      };
    }
  }

  const { data: fallback } = await supabase
    .from('planos')
    .select('id, preco')
    .eq('ativo', true)
    .neq('slug', PLANO_SLUGS.TRIAL)
    .order('preco', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!fallback?.id) return null;
  return { planoId: fallback.id, valor: Number(fallback.preco) || 0 };
}

async function resolveAssinaturaId(
  supabase: SupabaseClient,
  empresaId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('assinaturas')
    .select('id, status')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(20);

  const rows = data || [];
  const active = rows.find((r) => {
    const s = String(r.status || '').toLowerCase();
    return s === 'active' || s === 'ativa' || s === 'pending_payment' || s === 'trial';
  });
  return active?.id || rows[0]?.id || null;
}

export type AplicarPagamentoNovoResult =
  | { ok: true; coberturaAte: string; alreadyApplied?: boolean }
  | { ok: false; error: string; code?: string };

/**
 * Único caminho do sistema novo: pagamento confirmado → vencimento dia 10.
 */
export async function aplicarPagamentoNoNovoCiclo(
  supabase: SupabaseClient,
  params: {
    empresaId: string;
    pagamento: PagamentoLocalRow;
    gatewayPaymentId: string;
    paymentYmd: string;
    paidAtIso: string;
    valorAsaas?: number | null;
    tipoCobranca?: TipoCobranca | null;
  }
): Promise<AplicarPagamentoNovoResult> {
  const empresaId = String(params.empresaId || '').trim();
  const gatewayPaymentId = String(params.gatewayPaymentId || '').trim();
  const paymentYmd = String(params.paymentYmd || '').slice(0, 10);
  const pagamento = params.pagamento;

  if (!empresaId || !pagamento?.id || !gatewayPaymentId || !/^\d{4}-\d{2}-\d{2}$/.test(paymentYmd)) {
    return { ok: false, error: 'Parâmetros inválidos', code: 'invalid_params' };
  }

  const jaAplicada = pagamento.cobertura_aplicada_ate
    ? String(pagamento.cobertura_aplicada_ate).slice(0, 10)
    : null;
  if (pagamento.assinatura_aplicada_em && jaAplicada) {
    return { ok: true, coberturaAte: jaAplicada, alreadyApplied: true };
  }

  const [{ data: empresa }, { data: assinaturaAtual }] = await Promise.all([
    supabase
      .from('empresas')
      .select('created_at')
      .eq('id', empresaId)
      .maybeSingle(),
    supabase
      .from('assinaturas')
      .select('id, status, data_fim, proxima_cobranca, data_trial_fim, data_inicio, observacoes, valor')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const payMarker = `[pay:${gatewayPaymentId}]`;
  if (String(assinaturaAtual?.observacoes || '').includes(payMarker)) {
    const cobertura =
      toYmd(assinaturaAtual?.data_fim) || toYmd(assinaturaAtual?.proxima_cobranca) || paymentYmd;
    await marcarPagamentoAplicado(supabase, pagamento.id, empresaId, {
      paidAtIso: pagamento.paid_at || params.paidAtIso,
      valor: params.valorAsaas ?? pagamento.valor,
      coberturaAte: cobertura,
    });
    return { ok: true, coberturaAte: cobertura, alreadyApplied: true };
  }

  const vencimentoAtual =
    toYmd(assinaturaAtual?.data_fim) || toYmd(assinaturaAtual?.proxima_cobranca);
  const trialFim = toYmd(assinaturaAtual?.data_trial_fim);
  const contratacao =
    toYmd(assinaturaAtual?.data_inicio) || toYmd(empresa?.created_at) || null;

  const tipo: TipoCobranca =
    params.tipoCobranca ||
    (pagamento.tipo_cobranca === 'prorata' || pagamento.tipo_cobranca === 'mensal'
      ? (pagamento.tipo_cobranca as TipoCobranca)
      : vencimentoAtual
        ? 'mensal'
        : 'prorata');

  const plano = await resolverPlanoId(supabase, empresaId, pagamento.plano_slug);
  if (!plano) {
    return { ok: false, error: 'Plano não encontrado', code: 'plano_nao_encontrado' };
  }

  const valorMensal =
    Number(assinaturaAtual?.valor) > 0 ? Number(assinaturaAtual?.valor) : plano.valor;

  const renovacao = calcularRenovacaoAposPagamento({
    pagamentoYmd: paymentYmd,
    tipo,
    vencimentoAtualYmd: vencimentoAtual,
    contratacaoYmd: contratacao,
    dataTrialFimYmd: trialFim,
    valorMensal,
  });

  const now = params.paidAtIso || new Date().toISOString();
  const observacoesPrevias = String(assinaturaAtual?.observacoes || '');
  const markersPrevios = [...observacoesPrevias.matchAll(/\[pay:[^\]]+\]/g)].map((m) => m[0]);
  const markers = [...new Set([...markersPrevios, payMarker])].slice(-8);
  const observacoes = [
    `[novo] Ativada por pagamento ${tipo}`,
    renovacao.noPrazo ? '(no prazo)' : '(atrasado — sem compensação de dias)',
    renovacao.diasProrata != null ? `(pró-rata ${renovacao.diasProrata}d)` : '',
    ...markers,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 1800);

  const payload = {
    plano_id: plano.planoId,
    status: 'active' as const,
    data_inicio: now,
    data_fim: renovacao.dataFimIso,
    data_trial_fim: null,
    proxima_cobranca: renovacao.dataFimIso,
    valor: valorMensal,
    updated_at: now,
    observacoes,
  };

  let assinaturaId = assinaturaAtual?.id || (await resolveAssinaturaId(supabase, empresaId));

  if (assinaturaId) {
    const { error } = await supabase
      .from('assinaturas')
      .update(payload)
      .eq('id', assinaturaId)
      .eq('empresa_id', empresaId);
    if (error) {
      console.error('aplicarPagamentoNoNovoCiclo update:', error);
      return { ok: false, error: error.message, code: 'db_error' };
    }
  } else {
    const { data: inserted, error } = await supabase
      .from('assinaturas')
      .insert({ empresa_id: empresaId, ...payload })
      .select('id')
      .maybeSingle();
    if (error || !inserted?.id) {
      console.error('aplicarPagamentoNoNovoCiclo insert:', error);
      return { ok: false, error: error?.message || 'Falha ao criar assinatura', code: 'db_error' };
    }
    assinaturaId = inserted.id;
  }

  await marcarPagamentoAplicado(supabase, pagamento.id, empresaId, {
    paidAtIso: params.paidAtIso,
    valor: params.valorAsaas ?? pagamento.valor,
    coberturaAte: renovacao.vencimentoYmd,
  });

  return { ok: true, coberturaAte: renovacao.vencimentoYmd };
}

export function tipoCobrancaAtualParaEmpresa(params: {
  dataTrialFimYmd: string | null;
  vencimentoAtualYmd: string | null;
  agora?: Date;
}): TipoCobranca {
  const hoje = hojeYmd(params.agora);
  if (params.vencimentoAtualYmd) return 'mensal';
  if (params.dataTrialFimYmd) return 'prorata';
  return hoje ? 'prorata' : 'mensal';
}
