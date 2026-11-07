import { addDaysYmd, toYmd, ymdToIsoNoon, compareYmd } from './calendar';
import { calcularDiasProrata, calcularTransicaoPosTrial, calcularValorProrata } from './prorata';
import { DIAS_TRIAL } from './trial';
import { calcularVencimentoAposPagamentoMensal, proximoDia10Apos } from './vencimentoDia10';
import type { ResultadoRenovacao, TipoCobranca } from './types';

/**
 * Decide o tipo de cobrança a emitir agora.
 */
export function resolverTipoCobranca(params: {
  dataTrialFimYmd: string | null;
  vencimentoAtualYmd: string | null;
  hojeYmd: string;
}): TipoCobranca {
  const { dataTrialFimYmd, vencimentoAtualYmd, hojeYmd } = params;

  if (vencimentoAtualYmd) {
    return 'mensal';
  }

  if (dataTrialFimYmd && compareYmd(hojeYmd, dataTrialFimYmd) >= 0) {
    return 'prorata';
  }

  if (dataTrialFimYmd && !vencimentoAtualYmd) {
    return 'prorata';
  }

  return 'mensal';
}

function renovacaoProrata(params: {
  contratacaoYmd?: string | null;
  dataTrialFimYmd?: string | null;
  valorMensal: number;
}): ResultadoRenovacao {
  const contratacao = toYmd(params.contratacaoYmd);
  if (contratacao) {
    const t = calcularTransicaoPosTrial({
      contratacaoYmd: contratacao,
      valorMensal: params.valorMensal,
    });
    return {
      tipo: 'prorata',
      vencimentoYmd: t.primeiroDia10Ymd,
      dataFimIso: ymdToIsoNoon(t.primeiroDia10Ymd),
      noPrazo: true,
      diasProrata: t.diasProrata,
      valorCobrado: t.valorProrata,
    };
  }

  const trialFim =
    toYmd(params.dataTrialFimYmd) ||
    (contratacao ? calcularTransicaoPosTrial({
      contratacaoYmd: contratacao,
      valorMensal: params.valorMensal,
    }).trialFimYmd : null);

  if (trialFim) {
    const primeiroDia10Ymd = proximoDia10Apos(trialFim);
    const diasProrata = calcularDiasProrata(trialFim, primeiroDia10Ymd);
    const valorCobrado = calcularValorProrata({
      valorMensal: params.valorMensal,
      diasProrata,
    });
    return {
      tipo: 'prorata',
      vencimentoYmd: primeiroDia10Ymd,
      dataFimIso: ymdToIsoNoon(primeiroDia10Ymd),
      noPrazo: true,
      diasProrata,
      valorCobrado,
    };
  }

  // Fallback seguro: próximo dia 10 após “hoje implícito” via trial padrão
  const fallbackContratacao = addDaysYmd(
    toYmd(params.dataTrialFimYmd) || '1970-01-01',
    -DIAS_TRIAL
  );
  const t = calcularTransicaoPosTrial({
    contratacaoYmd: fallbackContratacao,
    valorMensal: params.valorMensal,
  });
  return {
    tipo: 'prorata',
    vencimentoYmd: t.primeiroDia10Ymd,
    dataFimIso: ymdToIsoNoon(t.primeiroDia10Ymd),
    noPrazo: true,
    diasProrata: t.diasProrata,
    valorCobrado: t.valorProrata,
  };
}

/**
 * Aplica confirmação de pagamento → novo vencimento (sempre dia 10).
 * Substitui por completo a lógica de +30 dias.
 */
export function calcularRenovacaoAposPagamento(params: {
  pagamentoYmd: string;
  tipo: TipoCobranca;
  vencimentoAtualYmd?: string | null;
  contratacaoYmd?: string | null;
  dataTrialFimYmd?: string | null;
  valorMensal: number;
}): ResultadoRenovacao {
  const pagamentoYmd = params.pagamentoYmd.slice(0, 10);

  if (params.tipo === 'prorata') {
    return renovacaoProrata({
      contratacaoYmd: params.contratacaoYmd,
      dataTrialFimYmd: params.dataTrialFimYmd,
      valorMensal: params.valorMensal,
    });
  }

  const { vencimentoYmd, noPrazo } = calcularVencimentoAposPagamentoMensal({
    pagamentoYmd,
    vencimentoAtualYmd: params.vencimentoAtualYmd ?? null,
  });

  return {
    tipo: 'mensal',
    vencimentoYmd,
    dataFimIso: ymdToIsoNoon(vencimentoYmd),
    noPrazo,
    valorCobrado: params.valorMensal,
  };
}

/** Monta cotação (valor + vencimento alvo) para criar o PIX. */
export function cotarCobranca(params: {
  tipo: TipoCobranca;
  contratacaoYmd?: string | null;
  dataTrialFimYmd?: string | null;
  vencimentoAtualYmd?: string | null;
  pagamentoYmd: string;
  valorMensal: number;
}): ResultadoRenovacao {
  return calcularRenovacaoAposPagamento(params);
}
