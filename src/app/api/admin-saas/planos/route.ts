import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * Lista todos os planos disponíveis
 * GET /api/admin-saas/planos
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: planos, error } = await supabase
      .from('planos')
      .select('id, nome, descricao, preco, periodo, limite_usuarios, recursos_disponiveis')
      .eq('ativo', true)
      .order('preco', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, planos: planos || [] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}

