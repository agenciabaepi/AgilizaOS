import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/produtos-servicos/excluir?id=xxx
 * Exclui um produto/serviço por ID, somente se pertencer à empresa do usuário logado.
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    let user: { id: string } | null = null;
    const supabase = await createServerSupabaseClient();
    const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
    if (!authError && cookieUser) user = cookieUser;

    if (!user) {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (token) {
        const supabaseAuth = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user: tokenUser }, error: tokenError } = await supabaseAuth.auth.getUser(token);
        if (!tokenError && tokenUser) user = tokenUser;
      }
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
      return NextResponse.json(
        { error: 'Usuário ou empresa não encontrados' },
        { status: 403 }
      );
    }

    const { error } = await admin
      .from('produtos_servicos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', usuario.empresa_id);

    if (error) {
      console.error('Erro ao excluir produto:', error);
      return NextResponse.json(
        { error: error.message || 'Erro ao excluir' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro em produtos-servicos/excluir:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
