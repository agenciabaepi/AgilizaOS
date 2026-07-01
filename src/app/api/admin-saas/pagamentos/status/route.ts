import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  getPayment,
  isPaymentConfirmed,
} from '@/lib/asaas';
import { processarPagamentoConfirmado } from '@/lib/billing/ativarAssinaturaSegura';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id') || url.searchParams.get('pagamento_id');
    const mockApprove = url.searchParams.get('mock_approve') === '1';

    if (!paymentId) {
      return NextResponse.json(
        { error: 'payment_id ou pagamento_id obrigatório' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (mockApprove && paymentId.startsWith('mock_')) {
      return NextResponse.json({ status: 'approved' });
    }

    const payment = await getPayment(paymentId);
    const statusAsaas = payment?.status || 'PENDING';
    const approvedThisPayment = isPaymentConfirmed(statusAsaas);

    const { data: pagamentoRow } = await supabase
      .from('pagamentos')
      .select('id, empresa_id, status, plano_slug')
      .eq('mercadopago_payment_id', paymentId)
      .maybeSingle();

    if (!approvedThisPayment) {
      return NextResponse.json({ status: statusAsaas });
    }

    if (!pagamentoRow?.empresa_id) {
      console.warn(
        'pagamentos/status: pagamento confirmado no Asaas sem vínculo local — assinatura NÃO ativada',
        paymentId
      );
      return NextResponse.json({ status: 'approved' });
    }

    const result = await processarPagamentoConfirmado(supabase, {
      asaasPaymentId: paymentId,
      empresaId: pagamentoRow.empresa_id,
    });

    if (!result.ok) {
      console.warn('pagamentos/status: falha ao processar pagamento confirmado:', result);
    }

    return NextResponse.json({ status: 'approved' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar status';
    console.error('GET /api/admin-saas/pagamentos/status:', err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
