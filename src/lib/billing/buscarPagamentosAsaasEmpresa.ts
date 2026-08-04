import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPayment,
  isPaymentConfirmed,
  listCustomersByEmail,
  listPaymentsByCustomer,
} from '@/lib/asaas';

export type PagamentoAsaasConfirmado = {
  id: string;
  paymentDate?: string;
  dueDate?: string;
  value?: number;
};

/**
 * Lista pagamentos confirmados no Asaas vinculados à empresa (banco local + e-mail).
 */
export async function buscarPagamentosConfirmadosAsaasEmpresa(
  supabase: SupabaseClient,
  empresaId: string
): Promise<PagamentoAsaasConfirmado[]> {
  const { data: empresa } = await supabase
    .from('empresas')
    .select('email')
    .eq('id', empresaId)
    .maybeSingle();

  const byId = new Map<string, PagamentoAsaasConfirmado>();

  const { data: locais } = await supabase
    .from('pagamentos')
    .select('mercadopago_payment_id')
    .eq('empresa_id', empresaId)
    .not('mercadopago_payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);

  for (const row of locais || []) {
    const id = String(row.mercadopago_payment_id || '').trim();
    if (!id || id.startsWith('mock_')) continue;
    try {
      const p = await getPayment(id);
      if (p?.id && isPaymentConfirmed(p.status || '', p.paymentDate)) {
        byId.set(p.id, {
          id: p.id,
          paymentDate: p.paymentDate,
          dueDate: p.dueDate,
          value: p.value,
        });
      }
    } catch {
      /* ignore */
    }
  }

  const email = typeof empresa?.email === 'string' ? empresa.email.trim() : '';
  if (email) {
    try {
      const customers = await listCustomersByEmail(email);
      for (const c of customers) {
        const payments = await listPaymentsByCustomer(c.id);
        for (const p of payments) {
          if (!p?.id || !isPaymentConfirmed(p.status || '', p.paymentDate)) continue;
          byId.set(p.id, {
            id: p.id,
            paymentDate: p.paymentDate,
            dueDate: p.dueDate,
            value: p.value,
          });
        }
      }
    } catch (e) {
      console.warn('buscarPagamentosConfirmadosAsaasEmpresa: listCustomersByEmail falhou', e);
    }
  }

  return [...byId.values()].sort((a, b) => {
    const da = a.paymentDate || a.dueDate || '';
    const db = b.paymentDate || b.dueDate || '';
    return String(db).localeCompare(String(da));
  });
}

export function ultimoPagamentoConfirmadoAsaas(
  pagamentos: PagamentoAsaasConfirmado[]
): PagamentoAsaasConfirmado | null {
  return pagamentos[0] ?? null;
}

export function paymentYmdFromAsaas(p: PagamentoAsaasConfirmado, fallbackYmd: string): string {
  const ymd =
    (p.paymentDate && /^\d{4}-\d{2}-\d{2}/.test(p.paymentDate)
      ? p.paymentDate.slice(0, 10)
      : null) ||
    (p.dueDate && /^\d{4}-\d{2}-\d{2}/.test(p.dueDate) ? p.dueDate.slice(0, 10) : null);
  return ymd || fallbackYmd;
}
