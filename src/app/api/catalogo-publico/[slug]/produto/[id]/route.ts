import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { mapProdutoCatalogo } from '@/lib/catalogo-publico';
import { resolveCatalogoLojaBySlug } from '@/lib/catalogo-publico-server';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { slug: rawSlug, id } = await params;
    const produtoId = (id || '').trim();
    if (!produtoId) {
      return NextResponse.json({ ok: false, error: 'Produto inválido' }, { status: 400 });
    }

    const resolved = await resolveCatalogoLojaBySlug(rawSlug);
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: resolved.status });
    }

    const { empresa, config, empresaId } = resolved.data;
    const supabase = getSupabaseAdmin();

    let { data: row, error } = await supabase
      .from('produtos_servicos')
      .select('id, nome, obs, preco, categoria, marca, tipo, codigo, imagens_url, ativo, mostrar_catalogo')
      .eq('empresa_id', empresaId)
      .eq('id', produtoId)
      .eq('ativo', true)
      .maybeSingle();

    if (error && /mostrar_catalogo/i.test(error.message)) {
      const fallback = await supabase
        .from('produtos_servicos')
        .select('id, nome, obs, preco, categoria, marca, tipo, codigo, imagens_url, ativo')
        .eq('empresa_id', empresaId)
        .eq('id', produtoId)
        .eq('ativo', true)
        .maybeSingle();
      row = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ ok: false, error: 'Produto não encontrado' }, { status: 404 });
    }

    if ('mostrar_catalogo' in row && row.mostrar_catalogo === false) {
      return NextResponse.json({ ok: false, error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      empresa,
      config,
      produto: mapProdutoCatalogo(row),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
