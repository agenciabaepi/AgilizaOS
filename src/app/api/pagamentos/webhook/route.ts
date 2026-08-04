import { NextRequest, NextResponse } from 'next/server';
import { configureMercadoPago } from '@/lib/mercadopago';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { aplicarPagamentoAssinatura } from '@/lib/billing/aplicarPagamentoAssinatura';
import { isoToYmd } from '@/lib/billing/calcularCoberturaPagamento';

function parsePaymentDate(rawDate?: string | null): Date | null {
  if (!rawDate) return null;
  const raw = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function upsertFromPaymentId(paymentId: string, rawPayload: unknown) {
  const { config, Payment } = configureMercadoPago();
  const payment = await new Payment(config).get({ id: paymentId });
  if (!payment) throw new Error('Pagamento não encontrado no MP');

  const supabase = getSupabaseAdmin();

  const { data: pagamento } = await supabase
    .from('pagamentos')
    .select('id,empresa_id,valor,plano_id')
    .eq('mercadopago_payment_id', String(paymentId))
    .maybeSingle();

  const updateData: Record<string, unknown> = {
    mercadopago_payment_id: String(paymentId),
    status: payment.status as string,
    status_detail: (payment as { status_detail?: string }).status_detail || null,
    webhook_received: true,
    webhook_data: rawPayload,
    updated_at: new Date().toISOString(),
  };
  const dataPagamento = parsePaymentDate((payment as { date_approved?: string }).date_approved) || new Date();
  if (payment.status === 'approved') updateData.paid_at = dataPagamento.toISOString();

  if (pagamento?.id) {
    await supabase.from('pagamentos').update(updateData).eq('id', pagamento.id);

    if ((payment.status as string) === 'approved' && pagamento.empresa_id) {
      const payYmd =
        isoToYmd(dataPagamento.toISOString()) ||
        isoToYmd((payment as { date_approved?: string }).date_approved);
      if (!payYmd) throw new Error('Data de pagamento inválida');

      const { data: row } = await supabase
        .from('pagamentos')
        .select(
          'id, empresa_id, status, valor, paid_at, plano_slug, cupom_uso_id, cobertura_aplicada_ate, assinatura_aplicada_em'
        )
        .eq('id', pagamento.id)
        .single();

      if (row?.id) {
        const result = await aplicarPagamentoAssinatura(supabase, {
          empresaId: pagamento.empresa_id,
          pagamento: row,
          gatewayPaymentId: String(paymentId),
          paymentYmd: payYmd,
          paidAtIso: dataPagamento.toISOString(),
          valorAsaas: Number(pagamento.valor) || Number((payment as { transaction_amount?: number }).transaction_amount),
        });
        if (!result.ok) {
          console.warn('webhook MP: aplicarPagamentoAssinatura', result);
        }
      }
    }
  }
  return payment.status as string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');
    if (topic === 'payment' && id) {
      await upsertFromPaymentId(id, { topic, id });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const paymentId =
      body?.data?.id ||
      body?.id ||
      (typeof body === 'object' && body && 'resource' in body
        ? String((body as { resource?: string }).resource || '').split('/').pop()
        : null);
    if (paymentId) {
      await upsertFromPaymentId(String(paymentId), body);
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
