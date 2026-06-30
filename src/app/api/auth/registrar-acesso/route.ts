import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Registra o primeiro login bem-sucedido do usuário (idempotente).
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error } = await admin
      .from('usuarios')
      .select('id, primeiro_login_em')
      .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    if (error || !usuario?.id) {
      return NextResponse.json({ ok: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (usuario.primeiro_login_em) {
      return NextResponse.json({
        ok: true,
        primeiro_login_em: usuario.primeiro_login_em,
        ja_registrado: true,
      });
    }

    const agora = new Date().toISOString();
    const { error: updateError } = await admin
      .from('usuarios')
      .update({ primeiro_login_em: agora })
      .eq('id', usuario.id)
      .is('primeiro_login_em', null);

    if (updateError) {
      console.error('Erro ao registrar primeiro login:', updateError);
      return NextResponse.json({ ok: false, error: 'Erro ao registrar acesso' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      primeiro_login_em: agora,
      ja_registrado: false,
    });
  } catch (e) {
    console.error('POST /api/auth/registrar-acesso:', e);
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 });
  }
}
