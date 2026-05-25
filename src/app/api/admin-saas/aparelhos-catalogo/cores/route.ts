import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  fetchCoresPorAparelhoCatalogo,
  syncAparelhoCatalogoCores,
} from '@/lib/aparelhos-catalogo-cores-db';

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const aparelhoId = new URL(req.url).searchParams.get('aparelho_catalogo_id');
    if (!aparelhoId) {
      return NextResponse.json({ ok: false, error: 'aparelho_catalogo_id é obrigatório' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const cores = await fetchCoresPorAparelhoCatalogo(supabase, aparelhoId);
    return NextResponse.json({ ok: true, cores });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Substitui todas as variantes de cor do aparelho */
export async function PUT(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const aparelhoCatalogoId = body.aparelho_catalogo_id as string;
    if (!aparelhoCatalogoId) {
      return NextResponse.json({ ok: false, error: 'aparelho_catalogo_id é obrigatório' }, { status: 400 });
    }

    const variantes = Array.isArray(body.cores) ? body.cores : [];
    for (const v of variantes) {
      if (!v.cor_id) {
        return NextResponse.json({ ok: false, error: 'Cada variante precisa de cor_id' }, { status: 400 });
      }
    }

    const supabase = getSupabaseAdmin();
    const { error } = await syncAparelhoCatalogoCores(supabase, aparelhoCatalogoId, variantes);
    if (error) {
      const hint =
        error.message?.includes('aparelhos_catalogo_cores') || error.message?.includes('cores_catalogo')
          ? ' Execute database/cores_catalogo.sql e database/aparelhos_catalogo_cores.sql no Supabase.'
          : '';
      return NextResponse.json({ ok: false, error: error.message + hint }, { status: 500 });
    }

    const cores = await fetchCoresPorAparelhoCatalogo(supabase, aparelhoCatalogoId);
    return NextResponse.json({ ok: true, cores });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
