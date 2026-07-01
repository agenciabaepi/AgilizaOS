import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANO_SLUGS } from '@/config/planModules';

/**
 * Ativa ou renova assinatura após pagamento confirmado.
 * ⚠️ Não chamar diretamente — use `processarPagamentoConfirmado` em ativarAssinaturaSegura.ts.
 */
export async function ativarAssinaturaPorPagamento(
  supabase: SupabaseClient,
  empresaId: string,
  now: string,
  dataFim: Date,
  planoSlug?: string | null
): Promise<boolean> {
  const slug =
    planoSlug === PLANO_SLUGS.BASICO || planoSlug === PLANO_SLUGS.COMPLETO
      ? planoSlug
      : PLANO_SLUGS.COMPLETO;

  const { data: plano } = await supabase
    .from('planos')
    .select('id, preco')
    .eq('slug', slug)
    .eq('ativo', true)
    .maybeSingle();

  if (!plano?.id) {
    const { data: fallback } = await supabase
      .from('planos')
      .select('id, preco')
      .eq('ativo', true)
      .neq('slug', PLANO_SLUGS.TRIAL)
      .order('preco', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!fallback?.id) return false;
    return applyActivation(supabase, empresaId, fallback.id, fallback.preco, now, dataFim);
  }

  return applyActivation(supabase, empresaId, plano.id, plano.preco, now, dataFim);
}

async function applyActivation(
  supabase: SupabaseClient,
  empresaId: string,
  planoId: string,
  valor: number,
  now: string,
  dataFim: Date
): Promise<boolean> {
  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('id')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    plano_id: planoId,
    status: 'active' as const,
    data_inicio: now,
    data_fim: dataFim.toISOString(),
    data_trial_fim: null,
    proxima_cobranca: dataFim.toISOString(),
    valor: typeof valor === 'number' ? valor : 0,
    updated_at: now,
  };

  if (assinatura?.id) {
    const { error } = await supabase.from('assinaturas').update(payload).eq('id', assinatura.id);
    return !error;
  }

  const { error } = await supabase.from('assinaturas').insert({
    empresa_id: empresaId,
    ...payload,
  });
  return !error;
}
