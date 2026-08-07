import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

function parseMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function parseIntSafe(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const grupoId = searchParams.get('grupo_id');
    const categoriaId = searchParams.get('categoria_id');
    const subcategoriaId = searchParams.get('subcategoria_id');
    const busca = (searchParams.get('busca') || '').trim();
    const incluirInativos = searchParams.get('incluir_inativos') === 'true';
    const baixoEstoque = searchParams.get('baixo_estoque') === 'true';

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('pecas_catalogo')
      .select(
        '*, grupo:pecas_grupos_catalogo(id, nome, slug), categoria:pecas_categorias_catalogo(id, nome, slug), subcategoria:pecas_subcategorias_catalogo(id, nome, slug), fornecedor:pecas_fornecedores_catalogo(id, nome, slug, imagem_url)'
      )
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (grupoId) query = query.eq('grupo_id', grupoId);
    if (categoriaId) query = query.eq('categoria_id', categoriaId);
    if (subcategoriaId) query = query.eq('subcategoria_id', subcategoriaId);
    if (!incluirInativos) query = query.eq('ativo', true);
    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,codigo.ilike.%${busca}%,marca.ilike.%${busca}%,modelo_compativel.ilike.%${busca}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let pecas = data || [];
    if (baixoEstoque) {
      pecas = pecas.filter((p) => Number(p.estoque) <= Number(p.estoque_min));
    }

    return NextResponse.json({ ok: true, pecas });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const grupoId = String(body.grupo_id || '').trim();
    const nome = String(body.nome || '').trim();
    if (!grupoId || !nome) {
      return NextResponse.json({ ok: false, error: 'Grupo e nome são obrigatórios' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const fornecedorId = body.fornecedor_id ? String(body.fornecedor_id).trim() : null;
    let marca = body.marca ? String(body.marca).trim() : null;
    if (fornecedorId) {
      const { data: forn } = await supabase
        .from('pecas_fornecedores_catalogo')
        .select('nome')
        .eq('id', fornecedorId)
        .maybeSingle();
      if (forn?.nome) marca = forn.nome;
    }

    const { data, error } = await supabase
      .from('pecas_catalogo')
      .insert({
        grupo_id: grupoId,
        categoria_id: body.categoria_id ? String(body.categoria_id).trim() : null,
        subcategoria_id: body.subcategoria_id ? String(body.subcategoria_id).trim() : null,
        fornecedor_id: fornecedorId,
        codigo: body.codigo ? String(body.codigo).trim() : null,
        nome,
        descricao: body.descricao ? String(body.descricao).trim() : null,
        marca,
        modelo_compativel: body.modelo_compativel ? String(body.modelo_compativel).trim() : null,
        preco: parseMoney(body.preco),
        custo: body.custo !== undefined && body.custo !== null && body.custo !== '' ? parseMoney(body.custo) : null,
        estoque: parseIntSafe(body.estoque, 0),
        estoque_min: parseIntSafe(body.estoque_min, 0),
        unidade: body.unidade ? String(body.unidade).trim() : 'UN',
        imagem_url: body.imagem_url ? String(body.imagem_url).trim() : null,
        ativo: body.ativo !== false,
        destaque: !!body.destaque,
        ordem: typeof body.ordem === 'number' ? body.ordem : 100,
      })
      .select(
        '*, grupo:pecas_grupos_catalogo(id, nome, slug), categoria:pecas_categorias_catalogo(id, nome, slug), subcategoria:pecas_subcategorias_catalogo(id, nome, slug), fornecedor:pecas_fornecedores_catalogo(id, nome, slug, imagem_url)'
      )
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, peca: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.grupo_id !== undefined) updateData.grupo_id = String(body.grupo_id).trim();
    if (body.categoria_id !== undefined) {
      updateData.categoria_id = body.categoria_id ? String(body.categoria_id).trim() : null;
    }
    if (body.subcategoria_id !== undefined) {
      updateData.subcategoria_id = body.subcategoria_id ? String(body.subcategoria_id).trim() : null;
    }
    if (body.codigo !== undefined) updateData.codigo = body.codigo ? String(body.codigo).trim() : null;
    if (body.nome !== undefined) updateData.nome = String(body.nome).trim();
    if (body.descricao !== undefined) {
      updateData.descricao = body.descricao ? String(body.descricao).trim() : null;
    }
    if (body.marca !== undefined) updateData.marca = body.marca ? String(body.marca).trim() : null;
    if (body.modelo_compativel !== undefined) {
      updateData.modelo_compativel = body.modelo_compativel
        ? String(body.modelo_compativel).trim()
        : null;
    }
    if (body.preco !== undefined) updateData.preco = parseMoney(body.preco);
    if (body.custo !== undefined) {
      updateData.custo =
        body.custo !== null && body.custo !== '' ? parseMoney(body.custo) : null;
    }
    if (body.estoque !== undefined) updateData.estoque = parseIntSafe(body.estoque, 0);
    if (body.estoque_min !== undefined) updateData.estoque_min = parseIntSafe(body.estoque_min, 0);
    if (body.unidade !== undefined) updateData.unidade = String(body.unidade).trim() || 'UN';
    if (body.imagem_url !== undefined) {
      updateData.imagem_url = body.imagem_url ? String(body.imagem_url).trim() : null;
    }
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;
    if (body.destaque !== undefined) updateData.destaque = !!body.destaque;
    if (body.ordem !== undefined) updateData.ordem = Number(body.ordem) || 0;

    const supabase = getSupabaseAdmin();

    if (body.fornecedor_id !== undefined) {
      const fornecedorId = body.fornecedor_id ? String(body.fornecedor_id).trim() : null;
      updateData.fornecedor_id = fornecedorId;
      if (fornecedorId) {
        const { data: forn } = await supabase
          .from('pecas_fornecedores_catalogo')
          .select('nome')
          .eq('id', fornecedorId)
          .maybeSingle();
        if (forn?.nome) updateData.marca = forn.nome;
      } else if (body.marca === undefined) {
        updateData.marca = null;
      }
    }

    const { data, error } = await supabase
      .from('pecas_catalogo')
      .update(updateData)
      .eq('id', id)
      .select(
        '*, grupo:pecas_grupos_catalogo(id, nome, slug), categoria:pecas_categorias_catalogo(id, nome, slug), subcategoria:pecas_subcategorias_catalogo(id, nome, slug), fornecedor:pecas_fornecedores_catalogo(id, nome, slug, imagem_url)'
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Peça não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, peca: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('pecas_catalogo').delete().eq('id', id).select('id');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, error: 'Peça não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Peça excluída' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
