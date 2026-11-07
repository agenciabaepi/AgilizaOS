import { diffDaysYmd, parseYmdParts, daysInMonth } from './calendar';
import { calcularDataFimTrialYmd, DIAS_TRIAL } from './trial';
import { proximoDia10Apos } from './vencimentoDia10';

/**
 * Dias cobrados no pró-rata: do dia seguinte ao fim do trial até o dia anterior ao 1º dia 10.
 * Ex.: trial fim 20/07, 1º dia 10 = 10/08 → 20 dias (21/07 … 09/08).
 */
export function calcularDiasProrata(trialFimYmd: string, primeiroDia10Ymd: string): number {
  const span = diffDaysYmd(primeiroDia10Ymd, trialFimYmd);
  return Math.max(0, span - 1);
}

export function calcularValorProrata(params: {
  valorMensal: number;
  diasProrata: number;
  /** Denominador comercial; default 30. */
  diasBase?: number;
}): number {
  const base = params.diasBase && params.diasBase > 0 ? params.diasBase : 30;
  const bruto = (params.valorMensal * params.diasProrata) / base;
  return Math.round(bruto * 100) / 100;
}

/**
 * Transição trial → pró-rata → 1º ciclo dia 10.
 *
 * Ex.: contratou 20/06 → trial 20/07 → pró-rata até 10/08 (20 dias) → ciclo mensal.
 */
export function calcularTransicaoPosTrial(params: {
  contratacaoYmd: string;
  valorMensal: number;
  diasTrial?: number;
  diasBaseProrata?: number;
}): {
  trialFimYmd: string;
  primeiroDia10Ymd: string;
  diasProrata: number;
  valorProrata: number;
  diasNoMesDoVencimento: number;
} {
  const diasTrial = params.diasTrial ?? DIAS_TRIAL;
  const trialFimYmd = calcularDataFimTrialYmd(params.contratacaoYmd, diasTrial);
  const primeiroDia10Ymd = proximoDia10Apos(trialFimYmd);
  const diasProrata = calcularDiasProrata(trialFimYmd, primeiroDia10Ymd);
  const { y, m } = parseYmdParts(primeiroDia10Ymd);
  const diasNoMesDoVencimento = daysInMonth(y, m);
  const valorProrata = calcularValorProrata({
    valorMensal: params.valorMensal,
    diasProrata,
    diasBase: params.diasBaseProrata ?? 30,
  });

  return {
    trialFimYmd,
    primeiroDia10Ymd,
    diasProrata,
    valorProrata,
    diasNoMesDoVencimento,
  };
}
