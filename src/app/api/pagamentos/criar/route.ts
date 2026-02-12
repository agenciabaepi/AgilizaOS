import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  createCustomer,
  createPaymentPix,
  getPixQrCode,
} from '@/lib/asaas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: verificar se ASAAS está configurado (para debug) */
export async function GET() {
  let key = (process.env.ASAAS_API_KEY || '').trim();
  if ((!key || key.length < 10) && process.env.ASAAS_API_KEY_B64) {
    try {
      key = Buffer.from(process.env.ASAAS_API_KEY_B64, 'base64').toString('utf-8').trim();
    } catch {
      key = '';
    }
  }
  const ok = !!key && key.length >= 10;
  return NextResponse.json({
    asaas_configured: ok,
    hint: ok ? 'OK' : 'Adicione ASAAS_API_KEY ou ASAAS_API_KEY_B64 em .env (local) ou Vercel (produção) e reinicie/redeploy',
  });
}

/** Formato dueDate Asaas: YYYY-MM-DD */
function formatDueDate(daysFromNow = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { valor, descricao, mock, plano_slug } = body;

    if (mock === true) {
      const fakeId = `mock_${Date.now()}`;
      return NextResponse.json({
        success: true,
        qr_code: '00020126580014br.gov.bcb.pix0135mock-' + fakeId,
        qr_code_base64: null,
        payment_id: fakeId,
        pagamento_id: fakeId,
        status: 'PENDING',
      });
    }

    const numValor = Number(valor);
    if (!Number.isFinite(numValor) || numValor <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor inválido' },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let user: { id: string; email?: string } | null = null;

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
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error: usuarioError } = await admin
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuario?.empresa_id) {
      return NextResponse.json(
        { success: false, error: 'Usuário ou empresa não encontrados' },
        { status: 403 }
      );
    }

    const { data: empresaData, error: empresaError } = await admin
      .from('empresas')
      .select('id, nome, email, cnpj')
      .eq('id', usuario.empresa_id)
      .single();

    if (empresaError || !empresaData) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const customerName = (empresaData.nome || 'Cliente').trim();
    const customerEmail = (empresaData.email || user.email || `contato-${empresaData.id}@temp.com`).trim();
    const cpfCnpj = empresaData.cnpj ? String(empresaData.cnpj).replace(/\D/g, '') : undefined;

    const customer = await createCustomer({
      name: customerName,
      email: customerEmail,
      cpfCnpj: cpfCnpj || undefined,
    });

    const payment = await createPaymentPix({
      customer: customer.id,
      value: numValor,
      dueDate: formatDueDate(1),
      description: descricao || `Mensalidade ConsertOS - R$ ${numValor.toFixed(2)}`,
    });

    const qrData = await getPixQrCode(payment.id);

    let pagamentoId: string = payment.id;
    const { data: pagamentoRow, error: insertError } = await admin
      .from('pagamentos')
      .insert({
        empresa_id: usuario.empresa_id,
        mercadopago_payment_id: payment.id,
        status: payment.status || 'PENDING',
        valor: numValor,
      })
      .select('id')
      .single();

    if (insertError) {
      console.warn('Pagamento criado no Asaas, mas falha ao salvar no banco (tabela pagamentos):', insertError.message);
      // Continua e retorna o PIX para o usuário poder pagar; registro local pode ser ajustado depois
    } else if (pagamentoRow?.id) {
      pagamentoId = pagamentoRow.id;
    }

    return NextResponse.json({
      success: true,
      qr_code: qrData.payload,
      qr_code_base64: qrData.encodedImage || null,
      payment_id: payment.id,
      pagamento_id: pagamentoId,
      status: payment.status || 'PENDING',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao criar PIX';
    console.error('POST /api/pagamentos/criar:', err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
