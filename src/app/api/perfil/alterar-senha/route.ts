import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
 * POST /api/perfil/alterar-senha - Usuário autenticado altera a própria senha.
 * Body: { senhaAntiga, senhaNova, confirmarSenha }
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { senhaAntiga, senhaNova, confirmarSenha } = body;

    if (!senhaAntiga || !senhaNova || !confirmarSenha) {
      return NextResponse.json({ error: 'Preencha todos os campos de senha' }, { status: 400 });
    }

    if (senhaNova !== confirmarSenha) {
      return NextResponse.json({ error: 'A nova senha e a confirmação não coincidem' }, { status: 400 });
    }

    if (senhaNova.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    if (senhaAntiga === senhaNova) {
      return NextResponse.json({ error: 'A nova senha deve ser diferente da senha atual' }, { status: 400 });
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: 'E-mail não encontrado na conta' }, { status: 400 });
    }

    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email,
      password: senhaAntiga,
    });

    if (signInError) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: senhaNova,
    });

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao alterar senha: ' + updateError.message },
        { status: 400 }
      );
    }

    // Sincronizar e-mail do perfil com o Auth (login usa o e-mail canônico do Auth)
    const { data: usuarioRow } = await supabaseAdmin
      .from('usuarios')
      .select('id, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (usuarioRow && usuarioRow.email !== email) {
      await supabaseAdmin
        .from('usuarios')
        .update({ email })
        .eq('id', usuarioRow.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Erro POST /api/perfil/alterar-senha:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
