import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { EMAIL_VERIFICATION_ENABLED } from '@/config/email-verification';

/**
 * Resolve nome de usuário ou e-mail → e-mail canônico do Auth (onde a senha é validada).
 * Usa admin client para ignorar RLS na tabela usuarios.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const login = String(body.username ?? body.login ?? '').trim().toLowerCase();
    if (!login) {
      return NextResponse.json({ error: 'Login obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const usuarioQuery = login.includes('@')
      ? admin.from('usuarios').select('auth_user_id, email_verificado, nivel, empresa_id').eq('email', login).maybeSingle()
      : admin.from('usuarios').select('auth_user_id, email_verificado, nivel, empresa_id').eq('usuario', login).maybeSingle();

    const { data: usuario, error } = await usuarioQuery;

    if (error) {
      console.error('Erro ao buscar usuário para login:', error);
      return NextResponse.json({ error: 'Erro ao verificar usuário' }, { status: 500 });
    }

    if (!usuario?.auth_user_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(usuario.auth_user_id);
    if (authError || !authUser?.user?.email) {
      console.error('Erro ao buscar e-mail no Auth:', authError);
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    let emailVerificado = EMAIL_VERIFICATION_ENABLED ? usuario.email_verificado === true : true;
    let empresaVerificada = emailVerificado;

    if (!EMAIL_VERIFICATION_ENABLED) {
      return NextResponse.json({
        email: authUser.user.email,
        email_verificado: true,
        nivel: usuario.nivel,
        empresa_verificada: true,
      });
    }

    // Contas legadas já em uso: não exigir código novamente
    if (!emailVerificado && usuario.empresa_id) {
      const { count: ordensCount } = await admin
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', usuario.empresa_id);

      if ((ordensCount ?? 0) > 0) {
        emailVerificado = true;
        empresaVerificada = true;
        await admin
          .from('usuarios')
          .update({ email_verificado: true })
          .eq('auth_user_id', usuario.auth_user_id)
          .eq('email_verificado', false);
      }
    }

    if (usuario.nivel !== 'admin' && usuario.empresa_id && !empresaVerificada) {
      const { count } = await admin
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', usuario.empresa_id)
        .eq('nivel', 'admin')
        .eq('email_verificado', true);

      empresaVerificada = (count ?? 0) > 0;
    }

    return NextResponse.json({
      email: authUser.user.email,
      email_verificado: emailVerificado,
      nivel: usuario.nivel,
      empresa_verificada: empresaVerificada,
    });
  } catch (error) {
    console.error('Erro POST /api/auth/resolve-username:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
