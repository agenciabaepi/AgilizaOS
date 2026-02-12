import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * GET /api/admin-saas/metrics
 * Retorna contagens gerais e por status para o dashboard admin.
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const [
      { count: empresas },
      { count: usuarios },
      { data: assinaturas },
      { data: pagamentos },
    ] = await Promise.all([
      supabase.from('empresas').select('id', { count: 'exact', head: true }),
      supabase.from('usuarios').select('id', { count: 'exact', head: true }),
      supabase.from('assinaturas').select('status'),
      supabase.from('pagamentos').select('status'),
    ]);

    const assinaturasPorStatus: Record<string, number> = {};
    for (const a of assinaturas || []) {
      const s = (a as { status?: string }).status || '—';
      assinaturasPorStatus[s] = (assinaturasPorStatus[s] || 0) + 1;
    }

    const pagamentosPorStatus: Record<string, number> = {};
    for (const p of pagamentos || []) {
      const s = (p as { status?: string }).status || '—';
      pagamentosPorStatus[s] = (pagamentosPorStatus[s] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      empresas: empresas ?? 0,
      usuarios: usuarios ?? 0,
      assinaturas: (assinaturas || []).length,
      pagamentos: (pagamentos || []).length,
      assinaturasPorStatus,
      pagamentosPorStatus,
    });
  } catch (err: unknown) {
    console.error('Erro ao buscar métricas admin:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro inesperado',
      },
      { status: 500 }
    );
  }
}
