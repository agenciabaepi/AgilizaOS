import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { processarPagamentoConfirmado } from '@/lib/billing/ativarAssinaturaSegura';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Asaas — PAYMENT_RECEIVED / PAYMENT_CONFIRMED.
 * Configurar no painel Asaas: https://<dominio>/api/pagamentos/asaas-webhook
 *
 * Identifica a empresa mesmo sem linha local em `pagamentos` e libera a assinatura.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'body inválido' }, { status: 400 });
    }

    const event = String((body as { event?: string }).event || '').toUpperCase();
    const payment =
      (body as { payment?: { id?: string; status?: string } }).payment ||
      (body as { data?: { id?: string; status?: string } }).data ||
      null;

    const paymentId = payment?.id ? String(payment.id).trim() : '';
    const status = String(payment?.status || '').toUpperCase();

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'sem_payment_id' });
    }

    const paid =
      event === 'PAYMENT_RECEIVED' ||
      event === 'PAYMENT_CONFIRMED' ||
      event === 'PAYMENT_RECEIVED_IN_CASH' ||
      status === 'RECEIVED' ||
      status === 'CONFIRMED' ||
      status === 'RECEIVED_IN_CASH';

    if (!paid) {
      return NextResponse.json({ ok: true, ignored: true, event, status });
    }

    const supabase = getSupabaseAdmin();
    const result = await processarPagamentoConfirmado(supabase, {
      asaasPaymentId: paymentId,
    });

    if (!result.ok) {
      console.error('asaas-webhook: falha ao ativar', paymentId, result);
      const retryable =
        result.code === 'asaas_error' ||
        result.code === 'ativacao_falhou' ||
        result.code === 'db_error';
      return NextResponse.json(
        {
          ok: false,
          activated: false,
          code: result.code,
          error: result.error,
        },
        { status: retryable ? 500 : 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      activated: true,
      alreadyActive: result.alreadyActive === true,
      coberturaAte: result.coberturaAte,
      paymentId: result.paymentId,
    });
  } catch (e) {
    console.error('POST /api/pagamentos/asaas-webhook:', e);
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pagamentos/asaas-webhook',
    hint: 'Configure este URL no painel Asaas para PAYMENT_RECEIVED e PAYMENT_CONFIRMED',
  });
}
