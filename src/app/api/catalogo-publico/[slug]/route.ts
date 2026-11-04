import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { mapProdutoCatalogo, type CatalogoPublicoPayload } from '@/lib/catalogo-publico';
import { resolveCatalogoLojaBySlug } from '@/lib/catalogo-publico-server';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { slug: rawSlug } = await params;
    const resolved = await resolveCatalogoLojaBySlug(rawSlug);
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: resolved.status });
    }

    const { empresa, config, empresaId } = resolved.data;
    const supabase = getSupabaseAdmin();

    let { data: produtosRaw, error: prodError } = await supabase
      .from('produtos_servicos')
      .select('id, nome, obs, preco, categoria, marca, tipo, codigo, imagens_url, ativo, mostrar_catalogo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .eq('mostrar_catalogo', true)
      .order('nome', { ascending: true });

    if (prodError && /mostrar_catalogo/i.test(prodError.message)) {
      const fallback = await supabase
        .from('produtos_servicos')
        .select('id, nome, obs, preco, categoria, marca, tipo, codigo, imagens_url, ativo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      produtosRaw = fallback.data;
      prodError = fallback.error;
    }

    if (prodError) {
      return NextResponse.json({ ok: false, error: prodError.message }, { status: 500 });
    }

    const produtos = (produtosRaw || []).map(mapProdutoCatalogo);
    const categoriasSet = new Set<string>();
    for (const p of produtos) {
      if (p.categoria) categoriasSet.add(p.categoria);
    }

    const payload: CatalogoPublicoPayload = {
      empresa,
      config,
      produtos,
      categorias: Array.from(categoriasSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };

    return NextResponse.json({ ok: true, ...payload });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
