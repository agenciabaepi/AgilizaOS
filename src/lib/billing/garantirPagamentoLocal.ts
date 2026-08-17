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
};

const SELECTS = [
  'id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id, cobertura_aplicada_ate, assinatura_aplicada_em',
  'id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id',
  'id, empresa_id, status, valor, paid_at',
];

async function selectPagamento(
  supabase: SupabaseClient,
  asaasPaymentId: string
): Promise<PagamentoLocalRow | null> {
  for (const columns of SELECTS) {
    const { data, error } = await supabase
      .from('pagamentos')
      .select(columns)
      .eq('mercadopago_payment_id', asaasPaymentId)
      .limit(1)
      .maybeSingle();
    if (error) continue;
    if (data && typeof data === 'object' && 'id' in data && data.id) {
      return data as PagamentoLocalRow;
    }
    return null;
  }
  return null;
}

/**
 * Garante uma linha em `pagamentos` para o ID Asaas, mesmo se o PIX foi gerado
 * só no gateway (sem webhook prévio).
 */
export async function garantirPagamentoLocal(
  supabase: SupabaseClient,
  params: {
    empresaId: string;
    asaasPaymentId: string;
    valor?: number | null;
    paidAtIso: string;
    status?: string;
  }
): Promise<{ pagamento: PagamentoLocalRow | null; error?: string }> {
  const asaasPaymentId = String(params.asaasPaymentId || '').trim();
  const empresaId = String(params.empresaId || '').trim();
  if (!asaasPaymentId || !empresaId) return { pagamento: null, error: 'Parâmetros inválidos' };

  const existing = await selectPagamento(supabase, asaasPaymentId);
  if (existing?.id) {
    if (existing.empresa_id && existing.empresa_id !== empresaId) {
      console.warn('garantirPagamentoLocal: payment já vinculado a outra empresa', {
        asaasPaymentId,
        existente: existing.empresa_id,
        esperado: empresaId,
      });
    }
    return { pagamento: existing };
  }

  const insertPayload = {
    empresa_id: empresaId,
    mercadopago_payment_id: asaasPaymentId,
    status: params.status || 'approved',
    valor: Number(params.valor) || 0,
    paid_at: params.paidAtIso,
  };

  const { error } = await supabase.from('pagamentos').insert(insertPayload);

  if (error) {
    const again = await selectPagamento(supabase, asaasPaymentId);
    if (again?.id) return { pagamento: again };
    console.error('garantirPagamentoLocal insert:', error.message);
    return { pagamento: null, error: error.message };
  }

  const inserted = await selectPagamento(supabase, asaasPaymentId);
  if (inserted?.id) return { pagamento: inserted };
  return { pagamento: null, error: 'Insert ok, mas a linha não foi lida de volta' };
}
