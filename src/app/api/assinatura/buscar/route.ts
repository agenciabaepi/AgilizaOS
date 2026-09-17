import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * Busca assinatura da empresa autenticada (ou admin com empresa_id).
 * Sem autenticação: 401 — não expor dados via service role.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const empresaIdBody = body?.empresa_id ? String(body.empresa_id).trim() : '';

    const adminOk = await isAdminAuthorized(request);
    let empresaId = empresaIdBody;

    if (!adminOk) {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }

      const admin = getSupabaseAdmin();
      const { data: usuario } = await admin
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!usuario?.empresa_id) {
        return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 403 });
      }

      // Usuário comum só consulta a própria empresa
      if (empresaIdBody && empresaIdBody !== String(usuario.empresa_id)) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      empresaId = String(usuario.empresa_id);
    }

    if (!empresaId) {
      return NextResponse.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: assinatura, error: assinaturaError } = await supabaseAdmin
      .from('assinaturas')
      .select('*')
      .eq('empresa_id', empresaId)
      .in('status', ['active', 'ativa', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assinaturaError || !assinatura) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
    }

    const { data: plano, error: planoError } = await supabaseAdmin
      .from('planos')
      .select('*')
      .eq('id', assinatura.plano_id)
      .maybeSingle();

    if (planoError || !plano) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...assinatura, plano },
    });
  } catch (error) {
    console.error('Erro na API route de busca de assinatura:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
