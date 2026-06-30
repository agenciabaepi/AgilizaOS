import type { SupabaseClient } from '@supabase/supabase-js';
import { pickAssinaturaParaContexto } from '@/lib/billing/pickAssinatura';

export type AdminAssinaturaRow = {
  id: string;
  status: string | null;
  proxima_cobranca: string | null;
  plano_id: string | null;
  created_at: string | null;
  data_trial_fim: string | null;
  valor: number | string | null;
  data_fim?: string | null;
};

const ASSINATURA_SELECT =
  'id,status,proxima_cobranca,plano_id,created_at,data_trial_fim,valor,data_fim';

/** Carrega assinaturas da empresa e devolve a linha que governa plano/cobrança no admin. */
export async function loadAssinaturaGovernanteAdmin(
  supabase: SupabaseClient,
  empresaId: string,
  empresaCreatedAt: string | null | undefined,
  empresaDiasTrial?: number | null
): Promise<AdminAssinaturaRow | null> {
  const { data: rows, error } = await supabase
    .from('assinaturas')
    .select(ASSINATURA_SELECT)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[adminEmpresaAssinatura] Erro ao listar assinaturas:', error);
    return null;
  }

  const picked = pickAssinaturaParaContexto(
    (rows || []) as Record<string, unknown>[],
    empresaCreatedAt,
    empresaDiasTrial
  );

  return (picked as AdminAssinaturaRow | null) ?? null;
}

/** ID da assinatura a alterar: governante ou a mais recente se não houver governante. */
export async function resolveAssinaturaIdParaAlteracao(
  supabase: SupabaseClient,
  empresaId: string,
  empresaCreatedAt: string | null | undefined,
  empresaDiasTrial?: number | null
): Promise<string | null> {
  const governante = await loadAssinaturaGovernanteAdmin(
    supabase,
    empresaId,
    empresaCreatedAt,
    empresaDiasTrial
  );
  if (governante?.id) return governante.id;

  const { data: latest } = await supabase
    .from('assinaturas')
    .select('id')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest?.id ?? null;
}

/** Encerra trials paralelos para o plano pago/admin prevalecer. */
export async function arquivarTrialsParalelos(
  supabase: SupabaseClient,
  empresaId: string,
  assinaturaPrincipalId: string,
  agora: string
) {
  await supabase
    .from('assinaturas')
    .update({
      status: 'cancelled',
      data_trial_fim: null,
      updated_at: agora,
      observacoes: 'Substituída por alteração de plano pelo admin',
    })
    .eq('empresa_id', empresaId)
    .neq('id', assinaturaPrincipalId)
    .eq('status', 'trial');
}
