import type { SupabaseClient } from '@supabase/supabase-js';
import { pickAssinaturaParaContexto } from '@/lib/billing/pickAssinatura';
import { expirarTrialsVencidosEmpresa, computeAcessoBloqueadoServidor } from '@/lib/billing/trialBilling';

/**
 * Quando a API usa service role, o RLS do Supabase não aplica — use esta função
 * antes de ler/gravar dados da empresa.
 *
 * @returns true se a empresa **não** pode usar o sistema (bloquear a operação).
 */
export async function empresaBloqueadaParaUsoSaasAdmin(
  admin: SupabaseClient,
  empresaId: string
): Promise<boolean> {
  const [{ data: rows }, { data: emp }] = await Promise.all([
    admin
      .from('assinaturas')
      .select('status, data_trial_fim, proxima_cobranca, data_fim, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(30),
    admin
      .from('empresas')
      .select('created_at, ativo, sistema_liberado, dias_trial')
      .eq('id', empresaId)
      .maybeSingle(),
  ]);

  if (emp && emp.ativo === false) return true;
  if (emp?.sistema_liberado === true) return false;

  await expirarTrialsVencidosEmpresa(
    admin,
    empresaId,
    emp?.created_at as string | undefined,
    typeof emp?.dias_trial === 'number' ? emp.dias_trial : null
  );

  const { data: rowsAfterExpire } = await admin
    .from('assinaturas')
    .select('status, data_trial_fim, proxima_cobranca, data_fim, created_at, observacoes')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(30);

  const row = pickAssinaturaParaContexto(
    (rowsAfterExpire ?? rows ?? []) as Record<string, unknown>[],
    emp?.created_at as string | undefined,
    typeof emp?.dias_trial === 'number' ? emp.dias_trial : null
  );

  const assinatura = row
    ? {
        status: String(row.status),
        data_trial_fim: row.data_trial_fim as string | null | undefined,
        proxima_cobranca: row.proxima_cobranca as string | null | undefined,
        data_fim: row.data_fim as string | null | undefined,
      }
    : null;

  return computeAcessoBloqueadoServidor(admin, {
    empresaId,
    assinatura,
    empresaCreatedAt: emp?.created_at as string | undefined,
    empresaDiasTrial: typeof emp?.dias_trial === 'number' ? emp.dias_trial : null,
    sistemaLiberado: emp?.sistema_liberado === true,
  });
}
