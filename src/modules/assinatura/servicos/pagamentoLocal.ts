import type { SupabaseClient } from '@supabase/supabase-js';

export type PagamentoLocalRow = {
  id: string;
  empresa_id: string;
  status: string | null;
  valor: number | null;
  paid_at: string | null;
  plano_slug: string | null;
  cupom_uso_id: string | null;
  cobertura_aplicada_ate?: string | null;
  assinatura_aplicada_em?: string | null;
  tipo_cobranca?: string | null;
};

async function selectPagamento(
  supabase: SupabaseClient,
  asaasPaymentId: string
): Promise<PagamentoLocalRow | null> {
  const selects = [
    'id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id, cobertura_aplicada_ate, assinatura_aplicada_em, tipo_cobranca',
    'id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id, cobertura_aplicada_ate, assinatura_aplicada_em',
    'id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id',
    'id, empresa_id, status, valor, paid_at',
  ];

  for (const columns of selects) {
    const { data, error } = await supabase
      .from('pagamentos')
      .select(columns)
      .eq('mercadopago_payment_id', asaasPaymentId)
      .limit(1)
      .maybeSingle();
    if (error) continue;
    const row = data as unknown as PagamentoLocalRow | null;
    if (row?.id) return row;
    return null;
  }
  return null;
}

export async function garantirPagamentoLocal(
  supabase: SupabaseClient,
  params: {
    empresaId: string;
    asaasPaymentId: string;
    valor?: number | null;
    paidAtIso: string;
    status?: string;
    planoSlug?: string | null;
    tipoCobranca?: string | null;
  }
): Promise<{ pagamento: PagamentoLocalRow | null; error?: string }> {
  const asaasPaymentId = String(params.asaasPaymentId || '').trim();
  const empresaId = String(params.empresaId || '').trim();
  if (!asaasPaymentId || !empresaId) return { pagamento: null, error: 'Parâmetros inválidos' };

  const existing = await selectPagamento(supabase, asaasPaymentId);
  if (existing?.id) return { pagamento: existing };

  const insertPayload: Record<string, unknown> = {
    empresa_id: empresaId,
    mercadopago_payment_id: asaasPaymentId,
    status: params.status || 'approved',
    valor: Number(params.valor) || 0,
    paid_at: params.paidAtIso,
  };
  if (params.planoSlug) insertPayload.plano_slug = params.planoSlug;
  if (params.tipoCobranca) insertPayload.tipo_cobranca = params.tipoCobranca;

  const { data, error } = await supabase
    .from('pagamentos')
    .insert(insertPayload)
    .select('id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id')
    .maybeSingle();

  if (error) {
    const again = await selectPagamento(supabase, asaasPaymentId);
    if (again) return { pagamento: again };
    return { pagamento: null, error: error.message };
  }

  return { pagamento: (data as unknown as PagamentoLocalRow) || null };
}

export async function marcarPagamentoAplicado(
  supabase: SupabaseClient,
  pagamentoId: string,
  empresaId: string,
  params: { paidAtIso: string; valor?: number | null; coberturaAte: string }
): Promise<void> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status: 'approved',
    paid_at: params.paidAtIso,
    updated_at: now,
  };
  if (params.valor != null) payload.valor = params.valor;

  for (const extra of [
    { cobertura_aplicada_ate: params.coberturaAte, assinatura_aplicada_em: now },
    { cobertura_aplicada_ate: params.coberturaAte },
    {},
  ]) {
    const { error } = await supabase
      .from('pagamentos')
      .update({ ...payload, ...extra })
      .eq('id', pagamentoId)
      .eq('empresa_id', empresaId);
    if (!error) return;
  }
}
