/**
 * Cálculo unificado de comissão de técnico.
 * Respeita `comissao_apenas_servico` da empresa.
 */

export type TipoComissao = 'porcentagem' | 'fixo';

export const COMISSAO_TZ = 'America/Sao_Paulo';

export function mesKeyLocal(
  dateInput: string | Date | null | undefined,
  timeZone: string = COMISSAO_TZ
): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  return y && m ? `${y}-${m}` : '';
}

export function mesAtualLocal(timeZone: string = COMISSAO_TZ): string {
  return mesKeyLocal(new Date(), timeZone);
}

/** Base e totais para % / exibição a partir dos valores da OS. */
export function resolverValoresBaseComissao(opts: {
  valorServico?: number | null;
  valorPeca?: number | null;
  valorFaturado?: number | null;
  /** true = só serviço; false = serviço + peças (valor faturado) */
  apenasServico?: boolean | null;
}): {
  valorServico: number;
  valorPeca: number;
  valorFaturado: number;
  /** Base usada no cálculo percentual */
  valorBaseCalculo: number;
  /** Total da OS para exibição */
  valorTotal: number;
} {
  const valorServico = Number(opts.valorServico ?? 0) || 0;
  const valorPeca = Number(opts.valorPeca ?? 0) || 0;
  const valorFaturadoRaw = Number(opts.valorFaturado ?? 0) || 0;
  const valorTotal =
    valorFaturadoRaw > 0 ? valorFaturadoRaw : valorServico + valorPeca;
  const apenasServico = opts.apenasServico !== false;

  let valorBaseCalculo: number;
  if (apenasServico) {
    // Preferir valor_servico; se zerado mas há faturado sem peça, usar faturado
    if (valorServico > 0) {
      valorBaseCalculo = valorServico;
    } else if (valorPeca <= 0 && valorTotal > 0) {
      valorBaseCalculo = valorTotal;
    } else {
      valorBaseCalculo = 0;
    }
  } else {
    valorBaseCalculo = valorTotal;
  }

  return {
    valorServico,
    valorPeca,
    valorFaturado: valorFaturadoRaw,
    valorBaseCalculo,
    valorTotal,
  };
}

export function calcularValorComissao(
  tipo: TipoComissao | string | null | undefined,
  taxa: number | null | undefined,
  valorBaseCalculo: number
): number {
  const t = (tipo || 'porcentagem').toLowerCase();
  const taxaNum = Number(taxa ?? 0) || 0;
  if (t === 'fixo') return taxaNum;
  return (valorBaseCalculo * taxaNum) / 100;
}

export function formatDateTimeBr(
  dateInput: string | Date | null | undefined,
  timeZone: string = COMISSAO_TZ
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateBr(
  dateInput: string | Date | null | undefined,
  timeZone: string = COMISSAO_TZ
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone });
}
