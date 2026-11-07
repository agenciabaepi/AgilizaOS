import { proximoDia10Apos, toYmd } from '@/modules/assinatura';

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

/** Vencimento exibido: pendente = dueDate; pago = próximo dia 10 após o pagamento. */
export function getVencimentoExibicaoCobranca(item: CobrancaItem): string | null {
  if (cobrancaFoiPaga(item)) {
    const base = getDataPagamentoCobranca(item) || item.dueDate;
    if (!base) return item.dueDate || null;
    const ymd = toYmd(base);
    if (!ymd) return item.dueDate || null;
    return proximoDia10Apos(ymd);
  }
  return item.dueDate || item.created_at || null;
}
