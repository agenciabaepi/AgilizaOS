import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/usuarios/[id] - Buscar um usuário (admin, mesma empresa).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let user = (await supabase.auth.getSession()).data.session?.user;
    if (!user && token) {
      const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
      user = tokenUser ?? undefined;
    }
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { data: meuUsuario } = await supabase
      .from('usuarios')
      .select('id, empresa_id, nivel')
      .eq('auth_user_id', user.id)
      .single();

    if (!meuUsuario || (meuUsuario.nivel !== 'admin' && meuUsuario.nivel !== 'usuarioteste')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, usuario, cpf, whatsapp, nivel, empresa_id, permissoes, auth_user_id')
      .eq('id', id)
      .eq('empresa_id', meuUsuario.empresa_id)
      .single();

    if (error || !usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const permissoes = usuario.permissoes;
    const permissoesArray = Array.isArray(permissoes)
      ? permissoes.filter((p: unknown): p is string => typeof p === 'string')
      : [];
    const payload = { ...usuario, permissoes: permissoesArray };

    const res = NextResponse.json(payload);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (e) {
    console.error('Erro GET /api/usuarios/[id]:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/usuarios/[id] - Atualizar usuário (admin, mesma empresa).
 * Body: { permissoes?: string[] }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let user = (await supabase.auth.getSession()).data.session?.user;
    if (!user && token) {
      const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
      user = tokenUser ?? undefined;
    }
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { data: meuUsuario } = await supabase
      .from('usuarios')
      .select('id, empresa_id, nivel')
      .eq('auth_user_id', user.id)
      .single();

    if (!meuUsuario || (meuUsuario.nivel !== 'admin' && meuUsuario.nivel !== 'usuarioteste')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { permissoes } = body;

    const update: Record<string, unknown> = {};
    if (Array.isArray(permissoes)) {
      update.permissoes = permissoes;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }

    const { data: atualizado, error } = await supabase
      .from('usuarios')
      .update(update)
      .eq('id', id)
      .eq('empresa_id', meuUsuario.empresa_id)
      .select('id, permissoes')
      .single();

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return NextResponse.json({ error: error.message || 'Erro ao atualizar' }, { status: 500 });
    }

    return NextResponse.json(atualizado);
  } catch (e) {
    console.error('Erro PATCH /api/usuarios/[id]:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
