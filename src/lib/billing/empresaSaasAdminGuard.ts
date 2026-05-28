import type { SupabaseClient } from '@supabase/supabase-js';
import { computeAssinaturaVencidaPorBilling } from '@/lib/billing/empresaSaasBilling';
import { BILLING_TIME_ZONE } from '@/lib/billing/billingTimeZone';
import { pickAssinaturaParaContexto } from '@/lib/billing/pickAssinatura';

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
    admin.from('empresas').select('created_at, ativo, sistema_liberado').eq('id', empresaId).maybeSingle(),
  ]);

  if (emp && emp.ativo === false) {
    return true;
  }

  if (emp?.sistema_liberado === true) {
    return false;
  }

  const row = pickAssinaturaParaContexto(
    (rows ?? []) as Record<string, unknown>[],
    emp?.created_at as string | undefined
  );
  const assinatura = row
    ? {
        status: String(row.status),
        data_trial_fim: row.data_trial_fim as string | null | undefined,
        proxima_cobranca: row.proxima_cobranca as string | null | undefined,
        data_fim: row.data_fim as string | null | undefined,
      }
    : null;

  return computeAssinaturaVencidaPorBilling(assinatura, emp?.created_at as string | undefined, {
    empresaIdPresent: true,
    timeZone: BILLING_TIME_ZONE,
  });
}
