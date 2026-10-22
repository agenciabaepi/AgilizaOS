import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * Lista clientes da empresa (admin SaaS — sem bloqueio de billing).
 * GET /api/admin-saas/empresas/[id]/clientes?search=
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
    const url = new URL(req.url);
    const search = (url.searchParams.get('search') || '').trim();
    const limitRaw = Number(url.searchParams.get('limit') || '40');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 40;

    const supabase = getSupabaseAdmin();

    let countQuery = supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);

    let query = supabase
      .from('clientes')
      .select(
        'id, numero_cliente, nome, telefone, celular, email, documento, tipo, status, cidade, created_at'
      )
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true })
      .limit(limit);

    if (search) {
      const filter = `nome.ilike.%${search}%,telefone.ilike.%${search}%,celular.ilike.%${search}%,email.ilike.%${search}%,documento.ilike.%${search}%`;
      query = query.or(filter);
      countQuery = countQuery.or(filter);
    }

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message || 'Erro ao listar clientes' },
        { status: 500 }
      );
    }

    if (countError) {
      return NextResponse.json(
        { ok: false, message: countError.message || 'Erro ao contar clientes' },
        { status: 500 }
      );
    }

    const total = count ?? (data?.length ?? 0);
    return NextResponse.json({
      ok: true,
      clientes: data ?? [],
      total,
      limit,
      truncated: total > (data?.length ?? 0),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
