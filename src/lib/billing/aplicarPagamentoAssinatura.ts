import type { SupabaseClient } from '@supabase/supabase-js';
import { ativarAssinaturaPorPagamento } from '@/lib/billing/ativarAssinaturaPagamento';
import {
  calcularCoberturaAposPagamento,
  DIAS_ACESSO_PAGAMENTO,
} from '@/lib/billing/calcularCoberturaPagamento';
import {
  coberturaYmdParaIso,
  getCoberturaAteYmd,
  payloadCoberturaAssinatura,
} from '@/lib/billing/coberturaAssinatura';
import { confirmarCupomUso } from '@/lib/billing/cupomServer';
import { resolveAssinaturaIdParaAlteracao } from '@/lib/billing/adminEmpresaAssinatura';

export type AplicarPagamentoResult =
  | { ok: true; coberturaAte: string; alreadyApplied?: boolean; activated?: boolean }
  | { ok: false; error: string; code?: string };

type PagamentoRow = {
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

/**
 * Único caminho que estende a cobertura da assinatura após um pagamento confirmado.
 * Idempotente via `pagamentos.assinatura_aplicada_em` + `cobertura_aplicada_ate`.
 */
export async function aplicarPagamentoAssinatura(
  supabase: SupabaseClient,
  params: {
    empresaId: string;
    pagamento: PagamentoRow;
    gatewayPaymentId: string;
    paymentYmd: string;
    paidAtIso: string;
    valorAsaas?: number | null;
  }
): Promise<AplicarPagamentoResult> {
  const empresaId = String(params.empresaId || '').trim();
  const pagamento = params.pagamento;
  const gatewayPaymentId = String(params.gatewayPaymentId || '').trim();
  const paymentYmd = String(params.paymentYmd || '').slice(0, 10);
  const paidAtIso = params.paidAtIso;

  if (!empresaId || !pagamento?.id || !gatewayPaymentId || !/^\d{4}-\d{2}-\d{2}$/.test(paymentYmd)) {
    return { ok: false, error: 'Parâmetros inválidos', code: 'invalid_params' };
  }

  const coberturaJaAplicada = pagamento.cobertura_aplicada_ate
    ? String(pagamento.cobertura_aplicada_ate).slice(0, 10)
    : null;

  if (pagamento.assinatura_aplicada_em && coberturaJaAplicada) {
    await repararCoberturaAssinaturaSeNecessario(supabase, empresaId, coberturaJaAplicada);
    await marcarPagamentoAprovado(supabase, pagamento.id, empresaId, {
      paidAtIso: pagamento.paid_at || paidAtIso,
      valor: params.valorAsaas ?? pagamento.valor,
      coberturaAte: coberturaJaAplicada,
    });
    return { ok: true, coberturaAte: coberturaJaAplicada, alreadyApplied: true, activated: true };
  }

  const { data: assinaturaAtual } = await supabase
    .from('assinaturas')
    .select('id, status, data_fim, proxima_cobranca')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const coberturaAtual = getCoberturaAteYmd(
    assinaturaAtual as { data_fim?: string | null; proxima_cobranca?: string | null } | null
  );

  const { coberturaYmd, dataFimIso, adiantou } = calcularCoberturaAposPagamento({
    dataPagamentoYmd: paymentYmd,
    coberturaAtualYmd: coberturaAtual,
  });

  const ativou = await ativarAssinaturaPorPagamento(
    supabase,
    empresaId,
    paidAtIso,
    new Date(dataFimIso),
    pagamento.plano_slug,
    {
      observacaoExtra: adiantou
        ? `(adiantamento: +${DIAS_ACESSO_PAGAMENTO}d a partir de ${coberturaAtual})`
        : null,
    }
  );

  if (!ativou) {
    return {
      ok: false,
      error: 'Pagamento confirmado, mas falha ao atualizar assinatura',
      code: 'ativacao_falhou',
    };
  }

  await marcarPagamentoAprovado(supabase, pagamento.id, empresaId, {
    paidAtIso,
    valor: params.valorAsaas ?? pagamento.valor,
    coberturaAte: coberturaYmd,
  });

  if (pagamento.cupom_uso_id) {
    await confirmarCupomUso(supabase, pagamento.cupom_uso_id, pagamento.id);
  }

  return { ok: true, coberturaAte: coberturaYmd, activated: true };
}

async function marcarPagamentoAprovado(
  supabase: SupabaseClient,
  pagamentoId: string,
  empresaId: string,
  params: { paidAtIso: string; valor?: number | null; coberturaAte: string }
) {
  const update: Record<string, unknown> = {
    status: 'approved',
    paid_at: params.paidAtIso,
    cobertura_aplicada_ate: params.coberturaAte,
    assinatura_aplicada_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const valor = Number(params.valor ?? 0);
  if (Number.isFinite(valor) && valor > 0) update.valor = valor;

  await supabase.from('pagamentos').update(update).eq('id', pagamentoId).eq('empresa_id', empresaId);
}

/** Corrige assinatura se datas no banco divergiram do registro idempotente do pagamento. */
async function repararCoberturaAssinaturaSeNecessario(
  supabase: SupabaseClient,
  empresaId: string,
  coberturaYmd: string
) {
  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('id, data_fim, proxima_cobranca')
    .eq('empresa_id', empresaId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const atual = getCoberturaAteYmd(
    assinatura as { data_fim?: string | null; proxima_cobranca?: string | null } | null
  );
  if (atual === coberturaYmd) return;

  const dataFimIso = coberturaYmdParaIso(coberturaYmd);
  const { data: empresa } = await supabase
    .from('empresas')
    .select('created_at, dias_trial')
    .eq('id', empresaId)
    .maybeSingle();

  const assinaturaId =
    assinatura?.id ||
    (await resolveAssinaturaIdParaAlteracao(
      supabase,
      empresaId,
      empresa?.created_at,
      empresa?.dias_trial
    ));

  if (!assinaturaId) return;

  await supabase
    .from('assinaturas')
    .update({
      status: 'active',
      ...payloadCoberturaAssinatura(dataFimIso),
      data_trial_fim: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assinaturaId)
    .eq('empresa_id', empresaId);
}
