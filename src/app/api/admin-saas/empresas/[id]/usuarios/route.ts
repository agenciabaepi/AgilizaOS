import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * GET /api/admin-saas/empresas/[id]/usuarios
 * Lista usuários de uma empresa (para impersonation / suporte).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select(
        'id, nome, email, usuario, nivel, auth_user_id, created_at, email_verificado, email_verificado_em, primeiro_login_em, verificacao_liberada_admin, verificacao_liberada_em, verificacao_liberada_por'
      )
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar usuários da empresa:', error);
      return NextResponse.json({ ok: false, message: 'Erro ao listar usuários' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      usuarios: (usuarios || []).filter((u) => u.auth_user_id),
    });
  } catch (e) {
    console.error('GET empresas/[id]/usuarios:', e);
    return NextResponse.json({ ok: false, message: 'Erro interno' }, { status: 500 });
  }
}
