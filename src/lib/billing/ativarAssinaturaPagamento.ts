import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANO_SLUGS } from '@/config/planModules';
import {
  arquivarTrialsParalelos,
  resolveAssinaturaIdParaAlteracao,
} from '@/lib/billing/adminEmpresaAssinatura';

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
  // Preferir a assinatura governante (mesma do app), não só a mais recente
  const { data: empresa } = await supabase
    .from('empresas')
    .select('created_at, dias_trial')
    .eq('id', empresaId)
    .maybeSingle();

  let assinaturaId = await resolveAssinaturaIdParaAlteracao(
    supabase,
    empresaId,
    empresa?.created_at,
    empresa?.dias_trial
  );

  if (!assinaturaId) {
    const { data: latest } = await supabase
      .from('assinaturas')
      .select('id')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    assinaturaId = latest?.id ?? null;
  }

  const dataFimIso = dataFim.toISOString();
  const payload = {
    plano_id: planoId,
    status: 'active' as const,
    data_inicio: now,
    data_fim: dataFimIso,
    data_trial_fim: null,
    proxima_cobranca: dataFimIso,
    valor: typeof valor === 'number' ? valor : 0,
    updated_at: now,
    observacoes: '[auto] Renovada/ativada por pagamento confirmado no Asaas',
  };

  if (assinaturaId) {
    const { error } = await supabase
      .from('assinaturas')
      .update(payload)
      .eq('id', assinaturaId)
      .eq('empresa_id', empresaId);
    if (error) {
      console.error('ativarAssinaturaPorPagamento update:', error);
      return false;
    }
    try {
      await arquivarTrialsParalelos(supabase, empresaId, assinaturaId, now);
    } catch (e) {
      console.warn('arquivarTrialsParalelos:', e);
    }
    return true;
  }

  const { data: inserted, error } = await supabase
    .from('assinaturas')
    .insert({
      empresa_id: empresaId,
      ...payload,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('ativarAssinaturaPorPagamento insert:', error);
    return false;
  }

  if (inserted?.id) {
    try {
      await arquivarTrialsParalelos(supabase, empresaId, inserted.id, now);
    } catch {
      /* ignore */
    }
  }

  return true;
}
