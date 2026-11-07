import { addDaysYmd, toYmd } from './calendar';

/** Trial unificado web + app. */
export const DIAS_TRIAL = 30;

/**
 * Fim do trial: data da contratação + 30 dias civis.
 * Ex.: contratou 2025-06-20 → trial até 2025-07-20.
 */
export function calcularDataFimTrialYmd(
  contratacaoYmdOuIso: string,
  dias: number = DIAS_TRIAL
): string {
  const ymd = toYmd(contratacaoYmdOuIso);
  if (!ymd) {
    throw new Error('data de contratação inválida');
  }
  return addDaysYmd(ymd, dias);
}

export function trialAindaVigente(params: {
  dataTrialFimYmd: string;
  hojeYmd: string;
}): boolean {
  return params.hojeYmd <= params.dataTrialFimYmd;
}
