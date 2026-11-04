import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { mapProdutoCatalogo, type CatalogoPublicoPayload } from '@/lib/catalogo-publico';
import { resolveCatalogoLojaBySlug } from '@/lib/catalogo-publico-server';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ slug: string }> };

const SELECT_FULL =
  'id, nome, obs, preco, categoria, marca, tipo, codigo, imagens_url, ativo, mostrar_catalogo, grupo_id, categoria_id, grupos_produtos(nome), categorias_produtos(nome)';

const SELECT_NO_MOSTRAR =
  'id, nome, obs, preco, categoria, marca, tipo, codigo, imagens_url, ativo, grupo_id, categoria_id, grupos_produtos(nome), categorias_produtos(nome)';

const SELECT_PLAIN =
  'id, nome, obs, preco, categoria, marca, tipo, codigo, imagens_url, ativo, grupo_id, categoria_id';

async function fetchProdutos(empresaId: string) {
  const supabase = getSupabaseAdmin();

  let { data, error } = await supabase
    .from('produtos_servicos')
    .select(SELECT_FULL)
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .eq('mostrar_catalogo', true)
    .order('nome', { ascending: true });

  if (error && /mostrar_catalogo/i.test(error.message)) {
    const fallback = await supabase
      .from('produtos_servicos')
      .select(SELECT_NO_MOSTRAR)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome', { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error && /(grupos_produtos|categorias_produtos)/i.test(error.message)) {
    const plain = await supabase
      .from('produtos_servicos')
      .select(SELECT_PLAIN)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome', { ascending: true });
    data = plain.data;
    error = plain.error;
  }

  return { data, error };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { slug: rawSlug } = await params;
    const resolved = await resolveCatalogoLojaBySlug(rawSlug);
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: resolved.status });
    }

    const { empresa, config, empresaId } = resolved.data;
    const { data: produtosRaw, error: prodError } = await fetchProdutos(empresaId);

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
