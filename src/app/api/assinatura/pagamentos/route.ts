import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lista pagamentos da empresa do usuário logado */
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

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(10, parseInt(url.searchParams.get('pageSize') || '20', 10)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = admin
      .from('pagamentos')
      .select('id, empresa_id, mercadopago_payment_id, status, valor, created_at, paid_at', { count: 'exact' })
      .eq('empresa_id', usuario.empresa_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: rows, error, count } = await query;

    if (error) {
      console.error('GET /api/assinatura/pagamentos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: rows || [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar pagamentos';
    console.error('GET /api/assinatura/pagamentos:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
