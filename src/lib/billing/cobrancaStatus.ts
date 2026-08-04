import { DIAS_ACESSO_PAGAMENTO, isoToYmd } from '@/lib/billing/calcularCoberturaPagamento';

export type CobrancaItem = {
  status?: string | null;
  paymentDate?: string | null;
  dueDate?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  value?: number;
  valor?: number;
};

export function cobrancaFoiPaga(item: CobrancaItem): boolean {
  if (isCobrancaPendente(item)) return false;
  if (getDataPagamentoCobranca(item)) return true;
  const s = String(item.status || '').toLowerCase();
  return ['confirmed', 'received', 'approved', 'pago'].includes(s);
}

export function isCobrancaPendente(item: CobrancaItem): boolean {
  const s = String(item.status || '').toUpperCase();
  const pagavel = s === 'PENDING' || s === 'OVERDUE';
  return !!pagavel && !getDataPagamentoCobranca(item);
}

export function getDataPagamentoCobranca(item: CobrancaItem): string | null {
  return item.paymentDate || item.paid_at || null;
}

/** Vencimento exibido na lista: pendente = dueDate; pago = pagamento + 30 dias. */
export function getVencimentoExibicaoCobranca(item: CobrancaItem): string | null {
  if (cobrancaFoiPaga(item)) {
    const base = getDataPagamentoCobranca(item) || item.dueDate;
    if (!base) return item.dueDate || null;
    return addDaysYmd(isoToYmd(base) || base.slice(0, 10), DIAS_ACESSO_PAGAMENTO);
  }
  return item.dueDate || item.created_at || null;
}

function addDaysYmd(ymd: string, days: number): string | null {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
