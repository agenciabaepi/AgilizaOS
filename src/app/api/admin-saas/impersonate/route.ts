import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getDashboardPathForNivel } from '@/lib/dashboardRouting';
import {
  applySupabaseSession,
  createImpersonationSession,
  getAdminEmailFromCookies,
  setImpersonationCookie,
} from '@/lib/admin-impersonation';

/**
 * POST /api/admin-saas/impersonate
 * Body: { usuario_id: string, empresa_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const usuarioId = typeof body.usuario_id === 'string' ? body.usuario_id.trim() : '';
    const empresaId = typeof body.empresa_id === 'string' ? body.empresa_id.trim() : '';

    if (!usuarioId || !empresaId) {
      return NextResponse.json({ ok: false, error: 'usuario_id e empresa_id são obrigatórios' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome, ativo')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json({ ok: false, error: 'Empresa não encontrada' }, { status: 404 });
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nome, email, nivel, auth_user_id, empresa_id')
      .eq('id', usuarioId)
      .eq('empresa_id', empresaId)
      .single();

    if (usuarioError || !usuario) {
      return NextResponse.json({ ok: false, error: 'Usuário não encontrado nesta empresa' }, { status: 404 });
    }

    if (!usuario.auth_user_id) {
      return NextResponse.json({ ok: false, error: 'Usuário sem login vinculado' }, { status: 400 });
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(usuario.auth_user_id);
    const targetEmail = authUser?.user?.email?.trim().toLowerCase();
    if (authError || !targetEmail) {
      return NextResponse.json({ ok: false, error: 'E-mail de login não encontrado' }, { status: 400 });
    }

    const session = await createImpersonationSession(targetEmail);
    await applySupabaseSession(session);

    const cookieStore = await cookies();
    const adminEmail = getAdminEmailFromCookies(cookieStore);
    const returnUrl = `/admin-saas/empresas/${empresaId}`;
    const startedAt = new Date().toISOString();

    const { data: logRow, error: logError } = await supabase
      .from('admin_impersonation_logs')
      .insert({
        admin_email: adminEmail,
        target_usuario_id: usuario.id,
        target_auth_user_id: usuario.auth_user_id,
        target_nome: usuario.nome,
        target_email: targetEmail,
        empresa_id: empresaId,
        empresa_nome: empresa.nome,
        started_at: startedAt,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Erro ao registrar log de impersonation (sessão já criada):', logError);
    }

    setImpersonationCookie(cookieStore, {
      logId: logRow?.id || 'unknown',
      targetUsuarioId: usuario.id,
      targetNome: usuario.nome || targetEmail,
      targetEmail,
      empresaId,
      empresaNome: empresa.nome || '',
      returnUrl,
      adminEmail,
      startedAt,
    });

    const redirect = getDashboardPathForNivel(usuario.nivel);

    return NextResponse.json({
      ok: true,
      redirect,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: targetEmail,
        nivel: usuario.nivel,
      },
      empresa: { id: empresa.id, nome: empresa.nome },
    });
  } catch (e) {
    console.error('POST /api/admin-saas/impersonate:', e);
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
