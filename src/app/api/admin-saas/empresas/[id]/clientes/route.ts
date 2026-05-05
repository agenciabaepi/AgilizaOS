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

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('clientes')
      .select(
        'id, numero_cliente, nome, telefone, celular, email, documento, tipo, status, cidade, created_at'
      )
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (search) {
      query = query.or(
        `nome.ilike.%${search}%,telefone.ilike.%${search}%,celular.ilike.%${search}%,email.ilike.%${search}%,documento.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message || 'Erro ao listar clientes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, clientes: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
