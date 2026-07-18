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
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId, usuarioId } = await params;
    const body = await req.json().catch(() => ({}));
    if (body.liberar !== true) {
      return NextResponse.json({ ok: false, message: 'Informe liberar: true' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error } = await admin
      .from('usuarios')
      .select('id, empresa_id, email_verificado, verificacao_liberada_admin')
      .eq('id', usuarioId)
      .maybeSingle();

    if (error || !usuario) {
      return NextResponse.json({ ok: false, message: 'Usuário não encontrado' }, { status: 404 });
    }

    if (usuario.empresa_id !== empresaId) {
      return NextResponse.json({ ok: false, message: 'Usuário não pertence a esta empresa' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const adminEmail = cookieStore.get('admin_saas_email')?.value?.trim() || 'admin_saas';
    const agora = new Date().toISOString();

    const { error: updateError } = await admin
      .from('usuarios')
      .update({
        email_verificado: true,
        verificacao_liberada_admin: true,
        verificacao_liberada_em: agora,
        verificacao_liberada_por: adminEmail,
      })
      .eq('id', usuarioId);

    if (updateError) {
      console.error('Erro ao liberar verificação:', updateError);
      return NextResponse.json({ ok: false, message: 'Erro ao atualizar usuário' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Verificação liberada pelo admin',
      usuario: {
        id: usuarioId,
        email_verificado: true,
        verificacao_liberada_admin: true,
        verificacao_liberada_em: agora,
        verificacao_liberada_por: adminEmail,
      },
    });
  } catch (e) {
    console.error('PATCH verificacao usuario:', e);
    return NextResponse.json({ ok: false, message: 'Erro interno' }, { status: 500 });
  }
}
