import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * Listar todos os tickets (Admin)
 * GET /api/admin-saas/tickets
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const prioridade = searchParams.get('prioridade');
    const categoria = searchParams.get('categoria');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');

    let query = supabase
      .from('tickets_suporte')
      .select(`
        *,
        empresa:empresas(id, nome, email, logo_url),
        usuario:usuarios!tickets_suporte_usuario_id_fkey(id, nome, email),
        resolvido_por_usuario:usuarios!tickets_suporte_resolvido_por_fkey(id, nome, email)
      `, { count: 'exact' })
      .order('updated_at', { ascending: false }); // Ordenar por updated_at para ver os mais recentes primeiro

    // Filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (prioridade) {
      query = query.eq('prioridade', prioridade);
    }
    if (categoria) {
      query = query.eq('categoria', categoria);
    }
    if (search) {
      query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Paginação
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: tickets, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar tickets:', error);
      return NextResponse.json(
        { ok: false, message: 'Erro ao buscar tickets' },
        { status: 500 }
      );
    }

    // Contar tickets por status (mais eficiente)
    const { data: statusCounts, error: countError } = await supabase
      .from('tickets_suporte')
      .select('status');

    if (countError) {
      console.error('Erro ao contar tickets por status:', countError);
    }

    const counts = {
      total: count || 0,
      aberto: statusCounts?.filter(t => t.status === 'aberto').length || 0,
      em_desenvolvimento: statusCounts?.filter(t => t.status === 'em_desenvolvimento').length || 0,
      aguardando_resposta: statusCounts?.filter(t => t.status === 'aguardando_resposta').length || 0,
      resolvido: statusCounts?.filter(t => t.status === 'resolvido').length || 0,
      fechado: statusCounts?.filter(t => t.status === 'fechado').length || 0,
    };

    return NextResponse.json({
      ok: true,
      tickets: tickets || [],
      counts,
      page,
      pageSize,
      total: count || 0
    });

  } catch (error) {
    console.error('Erro ao listar tickets:', error);
    return NextResponse.json(
      { ok: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

