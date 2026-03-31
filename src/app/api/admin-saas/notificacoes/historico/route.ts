import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * GET /api/admin-saas/notificacoes/historico
 * Lista o histórico de notificações push enviadas (para o admin).
 * Query: page, pageSize, tecnico_id (opcional), apenas_nao_abertas (opcional)
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
    const tecnicoId = url.searchParams.get('tecnico_id')?.trim() || '';
    const apenasNaoAbertas = url.searchParams.get('apenas_nao_abertas') === '1';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('notificacoes_push')
      .select(`
        id,
        auth_user_id,
        usuario_id,
        titulo,
        mensagem,
        enviado_em,
        enviado_por,
        aberto_em,
        created_at,
        usuarios:usuario_id ( id, nome )
      `, { count: 'exact' })
      .order('enviado_em', { ascending: false })
      .range(from, to);

    if (tecnicoId) {
      query = query.or(`usuario_id.eq.${tecnicoId},auth_user_id.eq.${tecnicoId}`);
    }
    if (apenasNaoAbertas) {
      query = query.is('aberto_em', null);
    }

    const { data: rows, error, count } = await query;

    if (error) {
      console.error('[admin-saas/notificacoes/historico] Erro:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (rows || []).map((r: any) => ({
      id: r.id,
      auth_user_id: r.auth_user_id,
      usuario_id: r.usuario_id,
      tecnico_nome: r.usuarios?.nome ?? '—',
      titulo: r.titulo,
      mensagem: r.mensagem ?? '',
      enviado_em: r.enviado_em,
      enviado_por: r.enviado_por,
      aberto_em: r.aberto_em ?? null,
    }));

    return NextResponse.json({
      notificacoes: list,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (e) {
    console.error('[admin-saas/notificacoes/historico] Erro:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar histórico' },
      { status: 500 }
    );
  }
}
