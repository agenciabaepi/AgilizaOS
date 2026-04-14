/** Período de teste grátis para empresa nova (cadastro público). */
export const DIAS_TRIAL_GRATIS = 15;

export const MS_TRIAL_GRATIS = DIAS_TRIAL_GRATIS * 24 * 60 * 60 * 1000;

/**
 * Fim do trial no mesmo critério do cadastro (`empresa/criar`): início + MS_TRIAL_GRATIS.
 * Usado quando ainda não existe linha em `assinaturas` (trial implícito pela data da empresa).
 */
export function dataFimTrialAPartirDe(isoInicio: string | null | undefined): string | null {
  if (!isoInicio) return null;
  const t = new Date(isoInicio).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + MS_TRIAL_GRATIS).toISOString();
}
