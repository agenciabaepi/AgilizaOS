import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { SMS_VERIFICATION_ENABLED } from '@/config/sms-verification';
import { avaliarGateVerificacao } from '@/lib/verification-gate';

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
      ? admin.from('usuarios').select('auth_user_id, email_verificado, email_verificado_em, verificacao_liberada_admin, nivel, empresa_id').eq('email', login).maybeSingle()
      : admin.from('usuarios').select('auth_user_id, email_verificado, email_verificado_em, verificacao_liberada_admin, nivel, empresa_id').eq('usuario', login).maybeSingle();

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

    if (!SMS_VERIFICATION_ENABLED) {
      return NextResponse.json({
        email: authUser.user.email,
        email_verificado: true,
        nivel: usuario.nivel,
        empresa_verificada: true,
        pode_entrar: true,
      });
    }

    const gate = await avaliarGateVerificacao({ authUserId: usuario.auth_user_id });

    return NextResponse.json({
      email: authUser.user.email,
      email_verificado: gate.email_verificado,
      nivel: usuario.nivel,
      empresa_verificada: gate.empresa_verificada,
      pode_entrar: gate.pode_entrar,
      motivo: gate.motivo,
    });
  } catch (error) {
    console.error('Erro POST /api/auth/resolve-username:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
