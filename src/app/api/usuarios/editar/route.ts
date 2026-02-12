import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/usuarios/editar - Atualizar usuário (admin/usuarioteste, mesma empresa).
 * Body: { id, nome?, email?, usuario?, cpf?, whatsapp?, nivel?, permissoes?, senha?, auth_user_id? }
 */
export async function POST(request: Request) {
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

    const { data: meuUsuario } = await supabase
      .from('usuarios')
      .select('id, empresa_id, nivel')
      .eq('auth_user_id', user.id)
      .single();

    if (!meuUsuario || (meuUsuario.nivel !== 'admin' && meuUsuario.nivel !== 'usuarioteste')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, nome, email, usuario, cpf, whatsapp, nivel, permissoes, senha, auth_user_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário não informado' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: alvo } = await supabaseAdmin
      .from('usuarios')
      .select('id, empresa_id')
      .eq('id', id)
      .single();

    if (!alvo || alvo.empresa_id !== meuUsuario.empresa_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (email && auth_user_id) {
      const { data: currentUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(auth_user_id);
      if (fetchError) {
        console.error('Erro ao buscar usuário atual:', fetchError);
        return NextResponse.json({ error: 'Erro ao verificar usuário atual' }, { status: 400 });
      }
      if (currentUser?.user?.email !== email) {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { email });
        if (emailError) {
          console.error('Erro ao atualizar e-mail no Auth:', emailError);
          const msg = emailError.message || '';
          const friendly = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('already registered')
            ? 'E-mail já cadastrado'
            : 'Erro ao atualizar e-mail: ' + msg;
          return NextResponse.json({ error: friendly }, { status: 400 });
        }
      }
    }

    if (senha && auth_user_id) {
      const { error: senhaError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { password: senha });
      if (senhaError) {
        return NextResponse.json({ error: 'Erro ao atualizar senha: ' + senhaError.message }, { status: 400 });
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (nome !== undefined) updatePayload.nome = nome;
    if (email !== undefined) updatePayload.email = email;
    if (usuario !== undefined) updatePayload.usuario = usuario;
    if (cpf !== undefined) updatePayload.cpf = cpf;
    if (whatsapp !== undefined) updatePayload.whatsapp = whatsapp;
    if (nivel !== undefined) updatePayload.nivel = nivel;
    if (permissoes !== undefined && Array.isArray(permissoes)) {
      updatePayload.permissoes = permissoes.filter((p): p is string => typeof p === 'string');
    }
    if (auth_user_id !== undefined && nivel === 'tecnico') {
      (updatePayload as Record<string, unknown>).tecnico_id = auth_user_id;
    }
    if (nivel !== undefined && nivel !== 'tecnico') {
      (updatePayload as Record<string, unknown>).tecnico_id = null;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: dbError } = await supabaseAdmin
        .from('usuarios')
        .update(updatePayload)
        .eq('id', id)
        .eq('empresa_id', meuUsuario.empresa_id);

      if (dbError) {
        console.error('Erro ao atualizar usuario:', dbError);
        const msg = (dbError.message || '').toLowerCase();
        const friendly = msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')
          ? 'E-mail ou nome de usuário já cadastrado para outro usuário'
          : dbError.message;
        return NextResponse.json({ error: friendly }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Erro POST /api/usuarios/editar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
