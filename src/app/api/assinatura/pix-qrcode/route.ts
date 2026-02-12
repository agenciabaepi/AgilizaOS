import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getPayment, getPixQrCode, listCustomersByEmail } from '@/lib/asaas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_PAGAVEIS = ['PENDING', 'OVERDUE'];

/** Retorna o QR Code PIX de uma cobrança Asaas pendente (para o usuário pagar) */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');
    if (!paymentId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'payment_id obrigatório' },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let user: { id: string } | null = null;

    if (bearerToken) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabaseAuth.auth.getUser(bearerToken);
      if (!error && data.user) user = data.user;
    }

    if (!user) {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set() {},
            remove() {},
          },
        }
      );
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error: usuarioError } = await admin
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuario?.empresa_id) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const { data: empresa, error: empresaError } = await admin
      .from('empresas')
      .select('id, email')
      .eq('id', usuario.empresa_id)
      .single();

    if (empresaError || !empresa?.email) {
      return NextResponse.json(
        { success: false, error: 'E-mail da empresa não encontrado' },
        { status: 403 }
      );
    }

    const payment = await getPayment(paymentId.trim());
    const status = (payment?.status || '').toUpperCase();
    if (!STATUS_PAGAVEIS.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Cobrança já paga ou cancelada' },
        { status: 400 }
      );
    }

    const customerId = payment.customer;
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Cobrança sem vínculo com cliente' },
        { status: 400 }
      );
    }

    const email = String(empresa.email).trim();
    const customers = await listCustomersByEmail(email);
    const pertenceEmpresa = customers.some((c) => c.id === customerId);
    if (!pertenceEmpresa) {
      return NextResponse.json(
        { success: false, error: 'Cobrança não pertence à sua empresa' },
        { status: 403 }
      );
    }

    const qrData = await getPixQrCode(payment.id);

    return NextResponse.json({
      success: true,
      qr_code: qrData.payload,
      qr_code_base64: qrData.encodedImage || null,
      payment_id: payment.id,
      pagamento_id: payment.id,
      status: payment.status || 'PENDING',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao obter QR Code PIX';
    console.error('GET /api/assinatura/pix-qrcode:', err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
