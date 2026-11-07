import type { SupabaseClient } from '@supabase/supabase-js';
import { decidirAcesso, hojeYmd, toYmd, type AssinaturaSnapshot } from '@/modules/assinatura';

export async function computeAcessoBloqueadoServidor(
  _supabase: SupabaseClient,
  params: {
    empresaId: string;
    assinatura: AssinaturaSnapshot | null;
    empresaCreatedAt?: string | null;
    empresaDiasTrial?: number | null;
    sistemaLiberado?: boolean;
  }
): Promise<boolean> {
  if (params.sistemaLiberado) return false;
  return !decidirAcesso({
    assinatura: params.assinatura,
    empresaCreatedAt: params.empresaCreatedAt,
    sistemaLiberado: params.sistemaLiberado,
  }).liberado;
}

/** Marca trials cujo data_trial_fim já passou e sem cobertura paga. */
export async function expirarTrialsVencidosEmpresa(
  supabase: SupabaseClient,
  empresaId: string,
  _empresaCreatedAt?: string | null,
  _empresaDiasTrial?: number | null
): Promise<void> {
  const hoje = hojeYmd();
  const { data: rows } = await supabase
    .from('assinaturas')
    .select('id, status, data_trial_fim, data_fim, proxima_cobranca')
    .eq('empresa_id', empresaId)
    .eq('status', 'trial')
    .limit(20);

  for (const row of rows || []) {
    const trialFim = toYmd(row.data_trial_fim);
    const cobertura = toYmd(row.data_fim) || toYmd(row.proxima_cobranca);
    if (trialFim && trialFim < hoje && !cobertura) {
      await supabase
        .from('assinaturas')
        .update({
          status: 'pending_payment',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('empresa_id', empresaId);
    }
  }
}
