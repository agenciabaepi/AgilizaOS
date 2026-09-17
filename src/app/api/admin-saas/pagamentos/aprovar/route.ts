import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { processarPagamentoConfirmado } from '@/lib/billing/ativarAssinaturaSegura';

/**
 * Aprova pagamento e libera a assinatura (mesmo caminho do webhook Asaas).
 * Body: { pagamento_id?: string, payment_id?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const pagamentoId = body.pagamento_id ? String(body.pagamento_id).trim() : '';
    const paymentId = body.payment_id ? String(body.payment_id).trim() : '';
    if (!pagamentoId && !paymentId) {
      return NextResponse.json(
        { ok: false, message: 'informe pagamento_id ou payment_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let asaasPaymentId = paymentId;
    let empresaId: string | null = null;

    if (pagamentoId || paymentId) {
      let q = supabase
        .from('pagamentos')
        .select('id, empresa_id, mercadopago_payment_id, status')
        .limit(1);
      q = pagamentoId ? q.eq('id', pagamentoId) : q.eq('mercadopago_payment_id', paymentId);
      const { data: row, error: fetchErr } = await q.maybeSingle();
      if (fetchErr) {
        return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
      }
      if (!row?.id) {
        return NextResponse.json({ ok: false, message: 'Pagamento não encontrado' }, { status: 404 });
      }
      empresaId = row.empresa_id ? String(row.empresa_id) : null;
      asaasPaymentId = String(row.mercadopago_payment_id || paymentId || '').trim();
    }

    if (!asaasPaymentId) {
      return NextResponse.json(
        { ok: false, message: 'Pagamento sem ID do gateway (Asaas)' },
        { status: 400 }
      );
    }

    const paidAt = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('pagamentos')
      .update({ status: 'approved', paid_at: paidAt, updated_at: paidAt })
      .eq(pagamentoId ? 'id' : 'mercadopago_payment_id', pagamentoId || asaasPaymentId);

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const result = await processarPagamentoConfirmado(supabase, {
      asaasPaymentId,
      empresaId,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          approved: true,
          activated: false,
          code: result.code,
          error: result.error,
          message:
            'Pagamento marcado como aprovado, mas a assinatura não foi liberada: ' + result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      approved: true,
      activated: true,
      alreadyActive: result.alreadyActive === true,
      coberturaAte: result.coberturaAte,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
