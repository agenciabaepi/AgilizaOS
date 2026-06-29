import { diffDiasCalendario, diffDiasCalendarioInTimeZone } from '@/lib/assinaturaCalendario';
import { dataFimTrialAPartirDe } from '@/config/trial';

export type BillingAssinaturaInput = {
  status: string;
  data_trial_fim?: string | null;
  proxima_cobranca?: string | null;
  data_fim?: string | null;
} | null;

export type ComputeAssinaturaVencidaOptions = {
  loading?: boolean;
  /** Se false, não bloqueia (ex.: ainda sem `empresa_id` no contexto). */
  empresaIdPresent?: boolean;
  /** Admin liberou acesso sem assinatura paga (coluna `empresas.sistema_liberado`). */
  sistemaLiberado?: boolean;
  /** Dias de trial customizados (`empresas.dias_trial`). */
  empresaDiasTrial?: number | null;
  /** Se definido, usa dias civis nesse fuso; senão, o mesmo critério `diffDiasCalendario` (local do ambiente). */
  timeZone?: string;
};

/**
 * Indica se o acesso ao app deve ser bloqueado por assinatura/trial (espelha a UI do guard).
 * No servidor/API, passe `timeZone` (ex. {@link BILLING_TIME_ZONE}) para alinhar ao Postgres.
 */
export function computeAssinaturaVencidaPorBilling(
  assinatura: BillingAssinaturaInput,
  empresaCreatedAt: string | null | undefined,
  opts?: ComputeAssinaturaVencidaOptions
): boolean {
  const loading = opts?.loading === true;
  const tz = opts?.timeZone;
  const useTz = Boolean(tz && tz.length > 0);

  if (loading) return false;
  if (opts?.empresaIdPresent === false) return false;
  if (opts?.sistemaLiberado === true) return false;

  const diff = (iso: string | null | undefined) =>
    useTz ? diffDiasCalendarioInTimeZone(iso, tz!) : diffDiasCalendario(iso);

  if (!assinatura) {
    const created = typeof empresaCreatedAt === 'string' ? empresaCreatedAt.trim() : '';
    if (!created) return true;
    const implicitEnd = dataFimTrialAPartirDe(created, opts?.empresaDiasTrial);
    if (!implicitEnd) return true;
    const d = diff(implicitEnd);
    return d !== null && d < 0;
  }

  if (['cancelled', 'expired', 'suspended', 'pending_payment'].includes(assinatura.status)) {
    return true;
  }

  if (assinatura.status === 'active') {
    if (assinatura.data_fim) {
      const d0 = diff(assinatura.data_fim);
      if (d0 !== null && d0 < 0) return true;
    }
    if (assinatura.proxima_cobranca) {
      const d = diff(assinatura.proxima_cobranca);
      if (d !== null && d < 0) return true;
    }
  }

  if (assinatura.status === 'trial') {
    if (assinatura.data_trial_fim) {
      const d = diff(assinatura.data_trial_fim);
      if (d !== null && d < 0) return true;
    } else {
      const created = typeof empresaCreatedAt === 'string' ? empresaCreatedAt.trim() : '';
      if (created) {
        const implicitEnd = dataFimTrialAPartirDe(created, opts?.empresaDiasTrial);
        if (implicitEnd) {
          const d = diff(implicitEnd);
          if (d !== null && d < 0) return true;
        }
      }
    }
  }

  return false;
}
