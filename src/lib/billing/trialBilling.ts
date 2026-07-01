import type { SupabaseClient } from '@supabase/supabase-js';
import { diffDiasCalendarioInTimeZone } from '@/lib/assinaturaCalendario';
import { dataFimTrialAPartirDe } from '@/config/trial';
import { BILLING_TIME_ZONE } from '@/lib/billing/billingTimeZone';
import {
  computeAssinaturaVencidaPorBilling,
  type BillingAssinaturaInput,
} from '@/lib/billing/empresaSaasBilling';
import { assinaturaAtivaTemDireito } from '@/lib/billing/ativarAssinaturaSegura';

function trialExpiradoPorCalendario(
  fimIso: string | null | undefined,
  empresaCreatedAt: string | null | undefined,
  empresaDiasTrial?: number | null
): boolean {
  const fim =
    (typeof fimIso === 'string' && fimIso.trim()) ||
    dataFimTrialAPartirDe(empresaCreatedAt, empresaDiasTrial);
  if (!fim) return false;
  const d = diffDiasCalendarioInTimeZone(fim, BILLING_TIME_ZONE);
  return d !== null && d < 0;
}

/** Marca trials vencidos como `expired` no banco (evita status `trial` eterno). */
export async function expirarTrialsVencidosEmpresa(
  supabase: SupabaseClient,
  empresaId: string,
  empresaCreatedAt: string | null | undefined,
  empresaDiasTrial?: number | null
): Promise<void> {
  const { data: trials } = await supabase
    .from('assinaturas')
    .select('id, data_trial_fim, status')
    .eq('empresa_id', empresaId)
    .eq('status', 'trial');

  if (!trials?.length) return;

  const agora = new Date().toISOString();
  for (const trial of trials) {
    if (
      !trialExpiradoPorCalendario(
        trial.data_trial_fim as string | null,
        empresaCreatedAt,
        empresaDiasTrial
      )
    ) {
      continue;
    }

    await supabase
      .from('assinaturas')
      .update({
        status: 'expired',
        data_fim: agora,
        proxima_cobranca: null,
        updated_at: agora,
      })
      .eq('id', trial.id)
      .eq('empresa_id', empresaId)
      .eq('status', 'trial');
  }
}

/** Fonte única server-side: trial vencido, assinatura expirada ou active sem pagamento. */
export async function computeAcessoBloqueadoServidor(
  supabase: SupabaseClient,
  params: {
    empresaId: string;
    assinatura: BillingAssinaturaInput;
    empresaCreatedAt: string | null | undefined;
    empresaDiasTrial?: number | null;
    sistemaLiberado?: boolean;
  }
): Promise<boolean> {
  if (params.sistemaLiberado) return false;

  const vencida = computeAssinaturaVencidaPorBilling(params.assinatura, params.empresaCreatedAt, {
    empresaIdPresent: true,
    sistemaLiberado: false,
    empresaDiasTrial: params.empresaDiasTrial,
    timeZone: BILLING_TIME_ZONE,
  });

  if (vencida) return true;

  if (params.assinatura && String(params.assinatura.status) === 'active') {
    const temDireito = await assinaturaAtivaTemDireito(
      supabase,
      params.empresaId,
      params.assinatura as Record<string, unknown>,
      false
    );
    if (!temDireito) return true;
  }

  return false;
}
