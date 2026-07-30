import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * PATCH — libera confirmação de conta sem código SMS (admin SaaS).
 * Body: { liberar: true }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; usuarioId: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json(
        { ok: false, reason: 'unauthorized', message: 'Sessão admin expirada. Faça login novamente no admin-saas.' },
        { status: 401 }
      );
    }

    const { id: empresaId, usuarioId } = await params;
    if (!empresaId || !usuarioId) {
      return NextResponse.json(
        { ok: false, message: 'empresaId e usuarioId são obrigatórios' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (body.liberar !== true) {
      return NextResponse.json({ ok: false, message: 'Informe liberar: true' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Busca por id da tabela OU auth_user_id (impersonation / IDs misturados)
    let { data: usuario, error } = await admin
      .from('usuarios')
      .select('id, empresa_id, email_verificado, verificacao_liberada_admin, auth_user_id, email, nivel')
      .eq('id', usuarioId)
      .maybeSingle();

    if ((!usuario || error) && usuarioId) {
      const second = await admin
        .from('usuarios')
        .select('id, empresa_id, email_verificado, verificacao_liberada_admin, auth_user_id, email, nivel')
        .eq('auth_user_id', usuarioId)
        .maybeSingle();
      usuario = second.data;
      error = second.error;
    }

    if (error) {
      console.error('Erro ao buscar usuário para liberar verificação:', error);
      return NextResponse.json(
        { ok: false, message: `Erro ao buscar usuário: ${error.message}` },
        { status: 500 }
      );
    }

    if (!usuario) {
      return NextResponse.json({ ok: false, message: 'Usuário não encontrado' }, { status: 404 });
    }

    if (usuario.empresa_id !== empresaId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Usuário não pertence a esta empresa',
          detalhe: { usuarioEmpresaId: usuario.empresa_id, empresaId },
        },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const adminEmail = cookieStore.get('admin_saas_email')?.value?.trim() || 'admin_saas';
    const agora = new Date().toISOString();

    const payload = {
      email_verificado: true,
      verificacao_liberada_admin: true,
      verificacao_liberada_em: agora,
      verificacao_liberada_por: adminEmail,
    };

    let { error: updateError } = await admin
      .from('usuarios')
      .update(payload)
      .eq('id', usuario.id);

    // Fallback se colunas de liberação ainda não existirem no banco
    if (
      updateError &&
      (updateError.message?.includes('verificacao_liberada') ||
        updateError.code === 'PGRST204' ||
        updateError.code === '42703')
    ) {
      const fallback = await admin
        .from('usuarios')
        .update({ email_verificado: true })
        .eq('id', usuario.id);
      updateError = fallback.error;
    }

    if (updateError) {
      console.error('Erro ao liberar verificação:', updateError);
      return NextResponse.json(
        { ok: false, message: `Erro ao atualizar usuário: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Verificação liberada pelo admin',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nivel: usuario.nivel,
        email_verificado: true,
        verificacao_liberada_admin: true,
        verificacao_liberada_em: agora,
        verificacao_liberada_por: adminEmail,
      },
    });
  } catch (e) {
    console.error('PATCH verificacao usuario:', e);
    return NextResponse.json(
      {
        ok: false,
        message: e instanceof Error ? e.message : 'Erro interno',
      },
      { status: 500 }
    );
  }
}
