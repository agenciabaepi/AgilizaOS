import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listCustomersByEmail, listPaymentsByCustomer } from '@/lib/asaas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lista cobranças do Asaas da empresa do usuário (por e-mail do cliente no Asaas) */
export async function GET(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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
      .select('id, nome, email')
      .eq('id', usuario.empresa_id)
      .single();

    if (empresaError || !empresa?.email) {
      return NextResponse.json({ items: [], message: 'E-mail da empresa não encontrado' });
    }

    const email = String(empresa.email).trim();
    const customers = await listCustomersByEmail(email);
    const allPayments: Array<{
      id: string;
      status: string;
      value: number;
      dueDate: string;
      paymentDate?: string;
      description?: string;
      billingType?: string;
      customer?: string;
    }> = [];

    for (const customer of customers) {
      const payments = await listPaymentsByCustomer(customer.id);
      for (const p of payments) {
        allPayments.push({
          id: p.id,
          status: p.status || 'PENDING',
          value: p.value ?? 0,
          dueDate: p.dueDate || '',
          paymentDate: p.paymentDate,
          customer: p.customer || customer.id,
        });
      }
    }

    allPayments.sort((a, b) => {
      const da = a.dueDate || a.paymentDate || '';
      const db = b.dueDate || b.paymentDate || '';
      return db.localeCompare(da);
    });

    return NextResponse.json({ items: allPayments, total: allPayments.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar cobranças Asaas';
    console.error('GET /api/assinatura/cobrancas-asaas:', err);
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
