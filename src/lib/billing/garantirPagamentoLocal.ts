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

const SELECT_PAGAMENTO =
  'id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id, cobertura_aplicada_ate, assinatura_aplicada_em';

const SELECT_PAGAMENTO_BASICO =
  'id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id';

async function selectPagamento(
  supabase: SupabaseClient,
  asaasPaymentId: string
): Promise<PagamentoLocalRow | null> {
  const full = await supabase
    .from('pagamentos')
    .select(SELECT_PAGAMENTO)
    .eq('mercadopago_payment_id', asaasPaymentId)
    .maybeSingle();

  if (!full.error && full.data?.id) return full.data as PagamentoLocalRow;

  const basic = await supabase
    .from('pagamentos')
    .select(SELECT_PAGAMENTO_BASICO)
    .eq('mercadopago_payment_id', asaasPaymentId)
    .maybeSingle();

  return (basic.data as PagamentoLocalRow | null) ?? null;
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
): Promise<PagamentoLocalRow | null> {
  const asaasPaymentId = String(params.asaasPaymentId || '').trim();
  const empresaId = String(params.empresaId || '').trim();
  if (!asaasPaymentId || !empresaId) return null;

  const existing = await selectPagamento(supabase, asaasPaymentId);
  if (existing?.id) {
    if (existing.empresa_id && existing.empresa_id !== empresaId) {
      console.warn('garantirPagamentoLocal: payment já vinculado a outra empresa', {
        asaasPaymentId,
        existente: existing.empresa_id,
        esperado: empresaId,
      });
    }
    return existing;
  }

  const insertPayload = {
    empresa_id: empresaId,
    mercadopago_payment_id: asaasPaymentId,
    status: params.status || 'approved',
    valor: Number(params.valor) || 0,
    paid_at: params.paidAtIso,
  };

  const { data: inserted, error } = await supabase
    .from('pagamentos')
    .insert(insertPayload)
    .select(SELECT_PAGAMENTO_BASICO)
    .maybeSingle();

  if (error) {
    const again = await selectPagamento(supabase, asaasPaymentId);
    if (again?.id) return again;
    console.error('garantirPagamentoLocal insert:', error.message);
    return null;
  }

  return (inserted as PagamentoLocalRow | null) ?? null;
}
