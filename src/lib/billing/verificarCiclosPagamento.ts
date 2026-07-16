import { DIAS_ACESSO_PAGAMENTO } from '@/lib/billing/ativarAssinaturaSegura';

export type PagamentoCicloInput = {
  id: string;
  status: string | null;
  valor: number | null;
  paid_at: string | null;
  created_at: string | null;
  due_date?: string | null;
  mercadopago_payment_id?: string | null;
  plano_slug?: string | null;
};

export type CicloMensalStatus =
  | 'pago'
  | 'atrasado'
  | 'pendente'
  | 'sem_pagamento'
  | 'proxima_cobranca';

export type CicloMensal = {
  indice: number;
  /** Início da cobertura = data do pagamento (YYYY-MM-DD) */
  inicio: string;
  /** Fim da cobertura = pagamento + 30 dias (YYYY-MM-DD) */
  fim: string;
  status: CicloMensalStatus;
  pagamento: {
    id: string;
    valor: number | null;
    paid_at: string | null;
    status: string | null;
    asaas_id: string | null;
  } | null;
  /** Dias de atraso quando o ciclo já passou sem renovação */
  diasAtraso: number | null;
};

export type ResumoCiclosPagamento = {
  totalPagamentos: number;
  totalPagos: number;
  valorTotalPago: number;
  ciclosEsperados: number;
  ciclosPagos: number;
  ciclosFaltando: number;
  /** Último dia coberto (com empilhamento de pagamentos antecipados) */
  coberturaAte: string | null;
  /** Data do último pagamento aprovado */
  ultimoPagamentoEm: string | null;
  emDia: boolean;
  diasAtrasoAtual: number | null;
  /** true quando já passou coberturaAte — próxima cobrança está pendente */
  proximaCobrancaPendente: boolean;
};

function toDateOnly(iso: string): string {
  const s = String(iso).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function parseLocalDate(iso: string): Date {
  const only = toDateOnly(iso);
  const [y, m, d] = only.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function addCalendarDays(iso: string, dias: number): string {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + dias);
  return formatLocalDate(d);
}

function diffCalendarDays(a: string, b: string): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export function isPagamentoConfirmado(status: string | null | undefined): boolean {
  const s = (status || '').toLowerCase();
  return ['approved', 'confirmed', 'received', 'pago'].includes(s);
}

/**
 * Cobertura real com empilhamento:
 * cada pagamento aprovado adiciona `diasCiclo` dias a partir de
 * max(dataPagamento, coberturaAnterior).
 *
 * Ex.: cobria até 15/08 e pagou em 08/08 → novo fim = 14/09 (adiantamento).
 * Ex.: venceu em 11/07 e pagou em 16/07 → novo fim = 15/08.
 */
export function buildCiclosMensais(
  pagamentos: PagamentoCicloInput[],
  opts?: {
    hojeIso?: string;
    diasCiclo?: number;
  }
): { ciclos: CicloMensal[]; resumo: ResumoCiclosPagamento } {
  const diasCiclo = opts?.diasCiclo ?? DIAS_ACESSO_PAGAMENTO;
  const hoje = opts?.hojeIso ?? formatLocalDate(new Date());

  const pagos = pagamentos
    .filter((p) => isPagamentoConfirmado(p.status) && (p.paid_at || p.created_at))
    .map((p) => ({
      ...p,
      dataRef: toDateOnly(p.paid_at || p.created_at!),
    }))
    .sort((a, b) => a.dataRef.localeCompare(b.dataRef));

  const totalPagamentos = pagamentos.length;
  const totalPagos = pagos.length;
  const valorTotalPago = pagos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

  const ciclos: CicloMensal[] = [];
  let coberturaAcumulada: string | null = null;

  for (let i = 0; i < pagos.length; i++) {
    const p = pagos[i];
    const adiantou = !!(coberturaAcumulada && coberturaAcumulada > p.dataRef);
    const base = adiantou ? coberturaAcumulada! : p.dataRef;
    const inicio = base;
    const fim = addCalendarDays(base, diasCiclo);
    coberturaAcumulada = fim;

    ciclos.push({
      indice: i + 1,
      inicio,
      fim,
      status: 'pago',
      pagamento: {
        id: p.id,
        valor: p.valor,
        paid_at: p.paid_at || p.dataRef,
        status: p.status,
        asaas_id: p.mercadopago_payment_id ?? null,
      },
      diasAtraso: null,
    });
  }

  const ultimo = pagos[pagos.length - 1];
  const ultimoPagamentoEm = ultimo?.dataRef ?? null;
  const coberturaAte = coberturaAcumulada;

  const emDia = !!coberturaAte && coberturaAte >= hoje;
  const diasAtrasoAtual =
    coberturaAte && coberturaAte < hoje ? diffCalendarDays(coberturaAte, hoje) : null;
  const proximaCobrancaPendente = !!coberturaAte && coberturaAte < hoje;

  // Após a última cobertura: linha da próxima cobrança (pendente ou futura)
  if (coberturaAte) {
    const proxFim = addCalendarDays(coberturaAte, diasCiclo);
    if (proximaCobrancaPendente) {
      ciclos.push({
        indice: ciclos.length + 1,
        inicio: coberturaAte,
        fim: proxFim,
        status: 'atrasado',
        pagamento: null,
        diasAtraso: diasAtrasoAtual,
      });
    } else {
      ciclos.push({
        indice: ciclos.length + 1,
        inicio: coberturaAte,
        fim: proxFim,
        status: 'proxima_cobranca',
        pagamento: null,
        diasAtraso: null,
      });
    }
  }

  const ciclosPagos = ciclos.filter((c) => c.status === 'pago').length;
  const ciclosFaltando = ciclos.filter(
    (c) => c.status === 'atrasado' || c.status === 'sem_pagamento'
  ).length;

  return {
    ciclos: [...ciclos].reverse(),
    resumo: {
      totalPagamentos,
      totalPagos,
      valorTotalPago,
      ciclosEsperados: Math.max(ciclosPagos + (proximaCobrancaPendente ? 1 : 0), ciclos.length),
      ciclosPagos,
      ciclosFaltando,
      coberturaAte,
      ultimoPagamentoEm,
      emDia,
      diasAtrasoAtual,
      proximaCobrancaPendente,
    },
  };
}

/** Compara data civil YYYY-MM-DD da assinatura com a cobertura real dos pagamentos. */
export function assinaturaDesatualizadaEmRelacaoACobertura(
  coberturaAte: string | null,
  proximaCobrancaIso: string | null | undefined,
  dataFimIso?: string | null
): boolean {
  if (!coberturaAte) return false;
  const refs = [proximaCobrancaIso, dataFimIso].filter(Boolean) as string[];
  if (!refs.length) return true;
  for (const ref of refs) {
    const only = toDateOnly(ref);
    // Assinatura "mais generosa" que o último pagamento justifica
    if (only > coberturaAte) return true;
  }
  return false;
}

export { toDateOnly as toDateOnlyPagamento, addCalendarDays as addCalendarDaysPagamento };
