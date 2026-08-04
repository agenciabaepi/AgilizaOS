import { dataFimTrialAPartirDe } from '@/config/trial';
import { diffDiasCalendario } from '@/lib/assinaturaCalendario';
import { isoToYmd } from '@/lib/billing/calcularCoberturaPagamento';
import {
  diasRestantesCobertura,
  getCoberturaAteYmd,
  labelStatusAssinatura,
  type AssinaturaCoberturaInput,
} from '@/lib/billing/coberturaAssinatura';

export type ResumoAssinatura = {
  cobertura_ate: string | null;
  dias_restantes: number | null;
  label_status: string;
  em_teste_gratis: boolean;
  trial_encerrado: boolean;
};

export function buildResumoAssinatura(
  assinatura: AssinaturaCoberturaInput & { status?: string | null },
  opts?: {
    empresaCreatedAt?: string | null;
    empresaDiasTrial?: number | null;
    agora?: Date;
  }
): ResumoAssinatura {
  const agora = opts?.agora ?? new Date();
  const status = assinatura?.status ?? null;
  const emTesteGratis = status === 'trial' && !isTrialExpirado(assinatura, opts);
  const trialEncerrado = status === 'trial' && isTrialExpirado(assinatura, opts);

  const cobertura_ate = emTesteGratis
    ? getTrialFimYmd(assinatura, opts)
    : getCoberturaAteYmd(assinatura);

  const dias_restantes = emTesteGratis
    ? diffDiasCalendario(getTrialFimYmd(assinatura, opts), agora)
    : status && ['cancelled', 'expired', 'suspended'].includes(String(status))
      ? null
      : diasRestantesCobertura(assinatura, agora);

  return {
    cobertura_ate,
    dias_restantes,
    label_status: labelStatusAssinatura({
      status,
      diasRestantes: dias_restantes,
      emTesteGratis,
    }),
    em_teste_gratis: emTesteGratis,
    trial_encerrado: trialEncerrado,
  };
}

function getTrialFimYmd(
  assinatura: AssinaturaCoberturaInput & { data_trial_fim?: string | null },
  opts?: { empresaCreatedAt?: string | null; empresaDiasTrial?: number | null }
): string | null {
  const raw =
    assinatura?.data_trial_fim ||
    dataFimTrialAPartirDe(opts?.empresaCreatedAt, opts?.empresaDiasTrial);
  return isoToYmd(raw);
}

function isTrialExpirado(
  assinatura: AssinaturaCoberturaInput & { data_trial_fim?: string | null },
  opts?: { empresaCreatedAt?: string | null; empresaDiasTrial?: number | null }
): boolean {
  const fim = getTrialFimYmd(assinatura, opts);
  if (!fim) return false;
  const d = diffDiasCalendario(fim);
  return d !== null && d < 0;
}
