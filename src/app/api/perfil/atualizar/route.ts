import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function getAuthenticatedUser(request: Request) {
  const supabase = await createServerSupabaseClient();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return user;
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) return user;

  return null;
}

/**
 * POST /api/perfil/atualizar - Usuário autenticado atualiza o próprio perfil.
 * Body: { nome?, email?, usuario?, cpf?, whatsapp? }
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: meuUsuario, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !meuUsuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { nome, email, usuario, cpf, whatsapp } = body;

    if (email) {
      const { data: currentUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(user.id);
      if (fetchError) {
        console.error('Erro ao buscar usuário atual:', fetchError);
        return NextResponse.json({ error: 'Erro ao verificar usuário atual' }, { status: 400 });
      }
      if (currentUser?.user?.email !== email) {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { email });
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

    const updatePayload: Record<string, unknown> = {};
    if (nome !== undefined) updatePayload.nome = nome;
    if (email !== undefined) updatePayload.email = email;
    if (usuario !== undefined) updatePayload.usuario = usuario;
    if (cpf !== undefined) updatePayload.cpf = cpf;
    if (whatsapp !== undefined) updatePayload.whatsapp = whatsapp;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .update(updatePayload)
      .eq('id', meuUsuario.id)
      .eq('empresa_id', meuUsuario.empresa_id);

    if (dbError) {
      console.error('Erro ao atualizar perfil:', dbError);
      const msg = (dbError.message || '').toLowerCase();
      const friendly = msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')
        ? 'E-mail ou nome de usuário já cadastrado para outro usuário'
        : dbError.message;
      return NextResponse.json({ error: friendly }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Erro POST /api/perfil/atualizar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
