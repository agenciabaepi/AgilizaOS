import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { PREMIUM_MODULES, type PremiumModule } from '@/config/planModules';

function parsePreco(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Lista planos (admin)
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
      .select('id, nome, descricao, preco, periodo, ativo, slug, limite_usuarios, recursos_disponiveis')
      .order('preco', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, planos: planos || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * Atualiza plano (preço, nome, recursos premium)
 * PATCH /api/admin-saas/planos
 * Body: { id, nome?, descricao?, preco?, ativo?, recursos_disponiveis? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, nome, descricao, preco, ativo, recursos_disponiveis } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof nome === 'string' && nome.trim()) update.nome = nome.trim();
    if (typeof descricao === 'string') update.descricao = descricao.trim();
    if (preco !== undefined) {
      const parsed = parsePreco(preco);
      if (parsed === null) {
        return NextResponse.json({ ok: false, error: 'preço inválido' }, { status: 400 });
      }
      update.preco = parsed;
    }
    if (typeof ativo === 'boolean') update.ativo = ativo;

    if (recursos_disponiveis && typeof recursos_disponiveis === 'object') {
      const validados: Partial<Record<PremiumModule, boolean>> = {};
      for (const key of Object.keys(PREMIUM_MODULES) as PremiumModule[]) {
        if (key in recursos_disponiveis) {
          validados[key] = !!recursos_disponiveis[key];
        }
      }
      if (Object.keys(validados).length > 0) {
        update.recursos_disponiveis = validados;
      }
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('planos')
      .update(update)
      .eq('id', id)
      .select('id, nome, descricao, preco, periodo, ativo, slug, recursos_disponiveis')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, plano: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
