import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const { pagamento_id, payment_id } = await req.json();
    if (!pagamento_id && !payment_id) return NextResponse.json({ ok: false, message: 'informe pagamento_id ou payment_id' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const match = pagamento_id ? { id: pagamento_id } : { mercadopago_payment_id: payment_id };
    const { error } = await supabase
      .from('pagamentos')
      .update({ status: 'approved', status_detail: 'manual_approved', paid_at: new Date().toISOString() })
      .match(match);
    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Erro inesperado' }, { status: 500 });
  }
}


