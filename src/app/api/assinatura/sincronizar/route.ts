import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { reconciliarPagamentosPendentesEmpresa } from '@/lib/billing/ativarAssinaturaSegura';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (bearerToken) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabaseAuth.auth.getUser(bearerToken);
    if (!error && data.user) return data.user;
  }

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
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!authError && user) return user;
  return null;
}

/**
 * Reconcilia cobranças locais pendentes com o Asaas.
 * Nunca ativa assinatura por “último PIX do e-mail” — só cobranças registradas em `pagamentos`.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error: usuarioError } = await admin
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuario?.empresa_id) {
      return NextResponse.json({ ok: false, error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const result = await reconciliarPagamentosPendentesEmpresa(admin, usuario.empresa_id);

    if (!result.ok) {
      const status =
        result.code === 'sem_pendentes' || result.code === 'not_confirmed' ? 404 : 400;
      return NextResponse.json({
        ok: false,
        activated: false,
        error: result.error,
        code: result.code,
      }, { status });
    }

    return NextResponse.json({
      ok: true,
      activated: true,
      alreadyActive: result.alreadyActive === true,
      message: result.alreadyActive
        ? 'Assinatura já estava ativa para o último pagamento confirmado.'
        : 'Assinatura ativada após confirmação do pagamento.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao sincronizar';
    console.error('GET /api/assinatura/sincronizar:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
