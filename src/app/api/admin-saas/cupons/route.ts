import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { normalizarCodigoCupom } from '@/lib/billing/cupomDesconto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parsePercentual(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return n;
}

/**
 * Lista cupons e histórico de uso
 * GET /api/admin-saas/cupons
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: cupons, error: cuponsErr } = await supabase
      .from('cupons_desconto')
      .select('id, codigo, percentual, ativo, descricao, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (cuponsErr) {
      return NextResponse.json({ ok: false, error: cuponsErr.message }, { status: 500 });
    }

    const { data: usos, error: usosErr } = await supabase
      .from('cupons_uso')
      .select(
        'id, cupom_id, empresa_id, pagamento_id, status, valor_original, valor_desconto, valor_final, confirmado_em, created_at, reservado_ate, empresas(nome, email)'
      )
      .in('status', ['reservado', 'confirmado'])
      .order('created_at', { ascending: false });

    if (usosErr) {
      return NextResponse.json({ ok: false, error: usosErr.message }, { status: 500 });
    }

    const usoPorCupom = new Map<string, (typeof usos)[number]>();
    for (const u of usos || []) {
      if (!usoPorCupom.has(u.cupom_id)) {
        usoPorCupom.set(u.cupom_id, u);
      }
    }

    const lista = (cupons || []).map((c) => {
      const uso = usoPorCupom.get(c.id);
      let situacao: 'disponivel' | 'reservado' | 'usado' | 'inativo' = c.ativo ? 'disponivel' : 'inativo';
      if (uso?.status === 'confirmado') situacao = 'usado';
      else if (uso?.status === 'reservado') situacao = 'reservado';

      const empresaRaw = uso?.empresas as { nome?: string; email?: string } | { nome?: string; email?: string }[] | null;
      const empresa = Array.isArray(empresaRaw) ? empresaRaw[0] : empresaRaw;

      return {
        ...c,
        situacao,
        uso: uso
          ? {
              id: uso.id,
              status: uso.status,
              empresa_id: uso.empresa_id,
              empresa_nome: empresa?.nome ?? null,
              empresa_email: empresa?.email ?? null,
              valor_original: uso.valor_original,
              valor_desconto: uso.valor_desconto,
              valor_final: uso.valor_final,
              confirmado_em: uso.confirmado_em,
              created_at: uso.created_at,
              reservado_ate: uso.reservado_ate,
              pagamento_id: uso.pagamento_id,
            }
          : null,
      };
    });

    return NextResponse.json({ ok: true, cupons: lista });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * Cria cupom de desconto (uso único)
 * POST /api/admin-saas/cupons
 * Body: { codigo, percentual, descricao? }
 */
export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const codigoRaw = typeof body.codigo === 'string' ? body.codigo : '';
    const codigo = normalizarCodigoCupom(codigoRaw);
    const percentual = parsePercentual(body.percentual);
    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : null;

    if (!codigo || codigo.length < 3) {
      return NextResponse.json({ ok: false, error: 'Código inválido (mín. 3 caracteres)' }, { status: 400 });
    }

    if (percentual === null) {
      return NextResponse.json({ ok: false, error: 'Percentual deve ser entre 1 e 100' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('cupons_desconto')
      .insert({
        codigo,
        percentual,
        descricao: descricao || null,
        ativo: true,
      })
      .select('id, codigo, percentual, ativo, descricao, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Já existe um cupom com este código' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cupom: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * Atualiza cupom (ativo / descrição)
 * PATCH /api/admin-saas/cupons
 * Body: { id, ativo?, descricao? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ativo, descricao } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof ativo === 'boolean') update.ativo = ativo;
    if (typeof descricao === 'string') update.descricao = descricao.trim() || null;

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ ok: false, error: 'Nada para atualizar' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('cupons_desconto')
      .update(update)
      .eq('id', id)
      .select('id, codigo, percentual, ativo, descricao')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cupom: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
