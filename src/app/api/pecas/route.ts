import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type SlugEntity = { id: string; nome: string; slug: string; descricao?: string | null };

/** API pública do catálogo de peças (sem autenticação). */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'grupos';
    const grupoSlug = (searchParams.get('grupo') || '').trim();
    const categoriaSlug = (searchParams.get('categoria') || '').trim();
    const subcategoriaSlug = (searchParams.get('subcategoria') || '').trim();
    const busca = (searchParams.get('busca') || '').trim();

    const supabase = getSupabaseAdmin();

    if (view === 'grupos') {
      const { data: grupos, error } = await supabase
        .from('pecas_grupos_catalogo')
        .select('id, nome, slug, descricao, icone, imagem_url, cor, ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const ids = (grupos || []).map((g) => g.id);
      let pecasCounts: Record<string, number> = {};
      let catCounts: Record<string, number> = {};

      if (ids.length) {
        const [{ data: pecas }, { data: cats }] = await Promise.all([
          supabase
            .from('pecas_catalogo')
            .select('grupo_id')
            .eq('ativo', true)
            .gt('estoque', 0)
            .in('grupo_id', ids),
          supabase
            .from('pecas_categorias_catalogo')
            .select('grupo_id')
            .eq('ativo', true)
            .in('grupo_id', ids),
        ]);

        pecasCounts = (pecas || []).reduce<Record<string, number>>((acc, row) => {
          acc[row.grupo_id] = (acc[row.grupo_id] || 0) + 1;
          return acc;
        }, {});
        catCounts = (cats || []).reduce<Record<string, number>>((acc, row) => {
          acc[row.grupo_id] = (acc[row.grupo_id] || 0) + 1;
          return acc;
        }, {});
      }

      return NextResponse.json({
        ok: true,
        grupos: (grupos || []).map((g) => ({
          ...g,
          pecas_count: pecasCounts[g.id] || 0,
          categorias_count: catCounts[g.id] || 0,
        })),
      });
    }

    // Resolve grupo
    let grupo: SlugEntity | null = null;
    if (grupoSlug) {
      const { data: g, error: gErr } = await supabase
        .from('pecas_grupos_catalogo')
        .select('id, nome, slug, descricao')
        .eq('slug', grupoSlug)
        .eq('ativo', true)
        .maybeSingle();

      if (gErr) {
        return NextResponse.json({ ok: false, error: gErr.message }, { status: 500 });
      }
      if (!g) {
        return NextResponse.json({ ok: false, error: 'Grupo não encontrado' }, { status: 404 });
      }
      grupo = g;
    }

    if (view === 'categorias') {
      if (!grupo) {
        return NextResponse.json({ ok: false, error: 'Grupo é obrigatório' }, { status: 400 });
      }

      const { data: categorias, error } = await supabase
        .from('pecas_categorias_catalogo')
        .select('id, nome, slug, imagem_url, ordem')
        .eq('grupo_id', grupo.id)
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const catIds = (categorias || []).map((c) => c.id);
      let subCounts: Record<string, number> = {};
      let pecasCounts: Record<string, number> = {};

      if (catIds.length) {
        const [{ data: subs }, { data: pecas }] = await Promise.all([
          supabase
            .from('pecas_subcategorias_catalogo')
            .select('categoria_id')
            .eq('ativo', true)
            .in('categoria_id', catIds),
          supabase
            .from('pecas_catalogo')
            .select('categoria_id')
            .eq('ativo', true)
            .gt('estoque', 0)
            .in('categoria_id', catIds),
        ]);

        subCounts = (subs || []).reduce<Record<string, number>>((acc, row) => {
          acc[row.categoria_id] = (acc[row.categoria_id] || 0) + 1;
          return acc;
        }, {});
        pecasCounts = (pecas || []).reduce<Record<string, number>>((acc, row) => {
          if (row.categoria_id) acc[row.categoria_id] = (acc[row.categoria_id] || 0) + 1;
          return acc;
        }, {});
      }

      return NextResponse.json({
        ok: true,
        grupo,
        categorias: (categorias || []).map((c) => ({
          ...c,
          subcategorias_count: subCounts[c.id] || 0,
          pecas_count: pecasCounts[c.id] || 0,
        })),
      });
    }

    // Resolve categoria
    let categoria: SlugEntity | null = null;
    if (categoriaSlug && grupo) {
      const { data: c } = await supabase
        .from('pecas_categorias_catalogo')
        .select('id, nome, slug')
        .eq('grupo_id', grupo.id)
        .eq('slug', categoriaSlug)
        .eq('ativo', true)
        .maybeSingle();

      if (!c) {
        return NextResponse.json({ ok: false, error: 'Categoria não encontrada' }, { status: 404 });
      }
      categoria = c;
    }

    if (view === 'subcategorias') {
      if (!grupo || !categoria) {
        return NextResponse.json(
          { ok: false, error: 'Grupo e categoria são obrigatórios' },
          { status: 400 }
        );
      }

      const { data: subcategorias, error } = await supabase
        .from('pecas_subcategorias_catalogo')
        .select('id, nome, slug, ordem')
        .eq('categoria_id', categoria.id)
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      // Todas as peças da categoria (com ou sem tipo)
      const { data: pecas, error: pecasErr } = await supabase
        .from('pecas_catalogo')
        .select(
          'id, grupo_id, categoria_id, subcategoria_id, codigo, nome, descricao, marca, modelo_compativel, preco, estoque, unidade, imagem_url, destaque, ordem, subcategoria:pecas_subcategorias_catalogo(id, nome, slug, ordem)'
        )
        .eq('ativo', true)
        .gt('estoque', 0)
        .eq('categoria_id', categoria.id)
        .order('destaque', { ascending: false })
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (pecasErr) {
        return NextResponse.json({ ok: false, error: pecasErr.message }, { status: 500 });
      }

      const pecasCounts = (pecas || []).reduce<Record<string, number>>((acc, row) => {
        if (row.subcategoria_id) {
          acc[row.subcategoria_id] = (acc[row.subcategoria_id] || 0) + 1;
        }
        return acc;
      }, {});

      return NextResponse.json({
        ok: true,
        grupo,
        categoria,
        subcategorias: (subcategorias || []).map((s) => ({
          ...s,
          pecas_count: pecasCounts[s.id] || 0,
        })),
        pecas: pecas || [],
      });
    }

    // view=pecas
    let subcategoria: SlugEntity | null = null;
    if (subcategoriaSlug && categoria) {
      const { data: s } = await supabase
        .from('pecas_subcategorias_catalogo')
        .select('id, nome, slug')
        .eq('categoria_id', categoria.id)
        .eq('slug', subcategoriaSlug)
        .eq('ativo', true)
        .maybeSingle();

      if (!s) {
        return NextResponse.json({ ok: false, error: 'Subcategoria não encontrada' }, { status: 404 });
      }
      subcategoria = s;
    }

    let query = supabase
      .from('pecas_catalogo')
      .select(
        'id, grupo_id, categoria_id, subcategoria_id, codigo, nome, descricao, marca, modelo_compativel, preco, estoque, unidade, imagem_url, destaque, ordem, categoria:pecas_categorias_catalogo(id, nome, slug), subcategoria:pecas_subcategorias_catalogo(id, nome, slug)'
      )
      .eq('ativo', true)
      .gt('estoque', 0)
      .order('destaque', { ascending: false })
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (grupo) query = query.eq('grupo_id', grupo.id);
    if (categoria) query = query.eq('categoria_id', categoria.id);
    if (subcategoria) query = query.eq('subcategoria_id', subcategoria.id);
    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,codigo.ilike.%${busca}%,marca.ilike.%${busca}%,modelo_compativel.ilike.%${busca}%`
      );
    }

    const { data: pecas, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      grupo,
      categoria,
      subcategoria,
      pecas: pecas || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
