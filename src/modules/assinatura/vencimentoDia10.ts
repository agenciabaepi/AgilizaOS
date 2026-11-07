import {
  addMonthsKeepingDay,
  compareYmd,
  parseYmdParts,
  formatUtcYmd,
} from './calendar';

export const DIA_VENCIMENTO = 10;

/**
 * Próximo dia 10 estritamente após `ymd`.
 * Se `ymd` já é dia 10, retorna o dia 10 do mês seguinte.
 */
export function proximoDia10Apos(ymd: string): string {
  const { y, m, d } = parseYmdParts(ymd);
  if (d < DIA_VENCIMENTO) {
    return formatUtcYmd(new Date(Date.UTC(y, m - 1, DIA_VENCIMENTO, 12, 0, 0)));
  }
  return addMonthsKeepingDay(ymd, 1, DIA_VENCIMENTO);
}

/**
 * Dia 10 do mês corrente se `ymd` for ≤ dia 10; senão dia 10 do mês seguinte.
 * Usado quando o vencimento atual ainda cobre o pagamento "em dia".
 */
export function dia10DoMesDe(ymd: string): string {
  const { y, m } = parseYmdParts(ymd);
  return formatUtcYmd(new Date(Date.UTC(y, m - 1, DIA_VENCIMENTO, 12, 0, 0)));
}

/**
 * Avança um ciclo: vencimento atual (dia 10) → dia 10 do mês seguinte.
 */
export function avancarUmCicloDia10(vencimentoAtualYmd: string): string {
  return addMonthsKeepingDay(vencimentoAtualYmd, 1, DIA_VENCIMENTO);
}

/**
 * Renovação no ciclo mensal (sem +30 dias).
 *
 * - Em dia ou adiantado (pagamentoYmd <= vencimentoAtual): próximo dia 10 após o vencimento atual.
 * - Atrasado (pagamentoYmd > vencimentoAtual): próximo dia 10 após a data do pagamento
 *   (dias entre vencimento e pagamento são perdidos).
 */
export function calcularVencimentoAposPagamentoMensal(params: {
  pagamentoYmd: string;
  vencimentoAtualYmd: string | null;
}): { vencimentoYmd: string; noPrazo: boolean } {
  const { pagamentoYmd, vencimentoAtualYmd } = params;

  if (!vencimentoAtualYmd) {
    return {
      vencimentoYmd: proximoDia10Apos(pagamentoYmd),
      noPrazo: false,
    };
  }

  const noPrazo = compareYmd(pagamentoYmd, vencimentoAtualYmd) <= 0;
  if (noPrazo) {
    return {
      vencimentoYmd: avancarUmCicloDia10(vencimentoAtualYmd),
      noPrazo: true,
    };
  }

  return {
    vencimentoYmd: proximoDia10Apos(pagamentoYmd),
    noPrazo: false,
  };
}

/** Acesso no ciclo pago: liberado no dia do vencimento inclusive; bloqueia a partir do dia seguinte. */
export function coberturaMensalVigente(params: {
  vencimentoYmd: string;
  hojeYmd: string;
}): boolean {
  return params.hojeYmd <= params.vencimentoYmd;
}
