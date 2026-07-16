import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getPayment, isPaymentConfirmed } from '@/lib/asaas';
import { processarPagamentoConfirmado } from '@/lib/billing/ativarAssinaturaSegura';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Status do pagamento Asaas + ativação da assinatura.
 * Só retorna activated=true quando a assinatura foi liberada de fato.
 */
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
      return NextResponse.json({ status: 'approved', activated: false, mock: true });
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
      return NextResponse.json({
        status: statusAsaas,
        activated: false,
        asaasStatus: statusAsaas,
      });
    }

    if (!pagamentoRow?.empresa_id) {
      console.warn(
        'pagamentos/status: Asaas confirmado sem vínculo local — assinatura NÃO ativada',
        paymentId
      );
      return NextResponse.json({
        status: 'approved',
        activated: false,
        code: 'pagamento_nao_vinculado',
        error: 'Pagamento confirmado no Asaas, mas sem vínculo local para liberar assinatura',
      });
    }

    const result = await processarPagamentoConfirmado(supabase, {
      asaasPaymentId: paymentId,
      empresaId: pagamentoRow.empresa_id,
    });

    if (!result.ok) {
      console.warn('pagamentos/status: falha ao ativar assinatura:', result);
      return NextResponse.json({
        status: 'approved',
        activated: false,
        code: result.code,
        error: result.error,
      });
    }

    return NextResponse.json({
      status: 'approved',
      activated: true,
      alreadyActive: result.alreadyActive === true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar status';
    console.error('GET /api/admin-saas/pagamentos/status:', err);
    return NextResponse.json({ error: message, activated: false }, { status: 500 });
  }
}
