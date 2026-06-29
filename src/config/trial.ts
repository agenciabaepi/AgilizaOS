/** Período de teste grátis para empresa nova (cadastro público). */
export const DIAS_TRIAL_GRATIS = 15;

export const MS_TRIAL_GRATIS = DIAS_TRIAL_GRATIS * 24 * 60 * 60 * 1000;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Dias efetivos de trial (override da empresa ou padrão). */
export function resolveDiasTrial(override?: number | null): number {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.min(365, Math.round(override));
  }
  return DIAS_TRIAL_GRATIS;
}

export function msTrialGratis(diasTrial?: number | null): number {
  return resolveDiasTrial(diasTrial) * MS_POR_DIA;
}

/**
 * Fim do trial: início + N dias (N = dias_trial da empresa ou padrão).
 * Usado quando ainda não existe linha em `assinaturas` (trial implícito).
 */
export function dataFimTrialAPartirDe(
  isoInicio: string | null | undefined,
  diasTrial?: number | null
): string | null {
  if (!isoInicio) return null;
  const t = new Date(isoInicio).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + msTrialGratis(diasTrial)).toISOString();
}

/** Soma N dias a partir de uma data ISO (para extensão de trial a partir de hoje). */
export function dataFimTrialSomandoDias(
  isoInicio: string | Date,
  diasTrial: number
): string {
  const t = isoInicio instanceof Date ? isoInicio.getTime() : new Date(isoInicio).getTime();
  const dias = resolveDiasTrial(diasTrial);
  return new Date(t + dias * MS_POR_DIA).toISOString();
}

/** Total de dias do período de teste (customizado, assinatura ou padrão). */
export function computeDiasTrialTotal(opts: {
  empresaDiasTrial?: number | null;
  dataInicio?: string | null;
  dataTrialFim?: string | null;
  empresaCreatedAt?: string | null;
}): number {
  if (typeof opts.empresaDiasTrial === 'number' && opts.empresaDiasTrial > 0) {
    return resolveDiasTrial(opts.empresaDiasTrial);
  }
  const inicio = opts.dataInicio?.trim() || opts.empresaCreatedAt?.trim();
  const fim = opts.dataTrialFim?.trim();
  if (inicio && fim) {
    const ms = new Date(fim).getTime() - new Date(inicio).getTime();
    if (Number.isFinite(ms) && ms > 0) {
      return Math.max(1, Math.ceil(ms / MS_POR_DIA));
    }
  }
  return DIAS_TRIAL_GRATIS;
}
