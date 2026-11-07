import { DIAS_TRIAL, calcularDataFimTrialYmd, addDaysYmd, toYmd } from '@/modules/assinatura';

/** Período de teste grátis unificado (web + app). */
export const DIAS_TRIAL_GRATIS = DIAS_TRIAL;

export const MS_TRIAL_GRATIS = DIAS_TRIAL_GRATIS * 24 * 60 * 60 * 1000;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function resolveDiasTrial(override?: number | null): number {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.min(365, Math.round(override));
  }
  return DIAS_TRIAL_GRATIS;
}

export function msTrialGratis(diasTrial?: number | null): number {
  return resolveDiasTrial(diasTrial) * MS_POR_DIA;
}

export function dataFimTrialAPartirDe(
  isoInicio: string | null | undefined,
  diasTrial?: number | null
): string | null {
  if (!isoInicio) return null;
  const ymd = toYmd(isoInicio);
  if (!ymd) return null;
  const fim = calcularDataFimTrialYmd(ymd, resolveDiasTrial(diasTrial));
  return `${fim}T12:00:00.000Z`;
}

export function dataFimTrialSomandoDias(
  isoInicio: string | Date,
  diasTrial: number
): string {
  const ymd = toYmd(isoInicio instanceof Date ? isoInicio.toISOString() : isoInicio);
  if (!ymd) return new Date().toISOString();
  return `${addDaysYmd(ymd, resolveDiasTrial(diasTrial))}T12:00:00.000Z`;
}

export function computeDiasTrialTotal(opts: {
  empresaDiasTrial?: number | null;
  dataInicio?: string | null;
  dataTrialFim?: string | null;
  empresaCreatedAt?: string | null;
}): number {
  if (typeof opts.empresaDiasTrial === 'number' && opts.empresaDiasTrial > 0) {
    return resolveDiasTrial(opts.empresaDiasTrial);
  }
  return DIAS_TRIAL_GRATIS;
}
