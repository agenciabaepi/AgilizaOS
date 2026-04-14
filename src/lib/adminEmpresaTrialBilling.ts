import { dataFimTrialAPartirDe } from '@/config/trial';
import { diffDiasCalendario } from '@/lib/assinaturaCalendario';

export type AdminAssinaturaLite = {
  status?: string | null;
  data_trial_fim?: string | null;
  plano_id?: string | null;
  proxima_cobranca?: string | null;
} | null | undefined;

export type AdminTrialFields = {
  dataTrialFim: string | null;
  trialImplicito: boolean;
  diasTrialRestantes: number | null;
  trialExpirado: boolean;
  emTrialAtivo: boolean;
};

/**
 * Alinha com o app: trial na tabela `assinaturas` ou, se não houver linha,
 * período de teste implícito a partir de `empresas.created_at` + MS_TRIAL_GRATIS.
 */
export function computeAdminEmpresaTrialFields(
  assinatura: AdminAssinaturaLite,
  empresaCreatedAt: string | null | undefined
): AdminTrialFields {
  let dataTrialFim: string | null =
    typeof assinatura?.data_trial_fim === 'string' && assinatura.data_trial_fim.trim()
      ? assinatura.data_trial_fim
      : null;

  const trialImplicito = !assinatura && !!empresaCreatedAt?.trim();
  if (trialImplicito) {
    dataTrialFim = dataFimTrialAPartirDe(empresaCreatedAt);
  }

  const diasDelta = dataTrialFim ? diffDiasCalendario(dataTrialFim) : null;
  const trialExpirado = diasDelta !== null && diasDelta < 0;
  const diasTrialRestantes = diasDelta === null ? null : Math.max(0, diasDelta);

  const emTrialAtivo =
    !!dataTrialFim &&
    !trialExpirado &&
    (assinatura?.status === 'trial' || trialImplicito);

  return {
    dataTrialFim,
    trialImplicito: trialImplicito && !!dataTrialFim,
    diasTrialRestantes,
    trialExpirado,
    emTrialAtivo,
  };
}
