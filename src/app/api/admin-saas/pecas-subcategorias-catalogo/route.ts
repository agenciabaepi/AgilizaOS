import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoriaId = searchParams.get('categoria_id');
    const incluirInativos = searchParams.get('incluir_inativos') === 'true';

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('pecas_subcategorias_catalogo')
      .select('*, categoria:pecas_categorias_catalogo(id, nome, slug, grupo_id)')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (categoriaId) query = query.eq('categoria_id', categoriaId);
    if (!incluirInativos) query = query.eq('ativo', true);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, subcategorias: data || [] });
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
    const categoriaId = String(body.categoria_id || '').trim();
    const nome = String(body.nome || '').trim();
    if (!categoriaId || !nome) {
      return NextResponse.json(
        { ok: false, error: 'Categoria e nome são obrigatórios' },
        { status: 400 }
      );
    }

    const slug = String(body.slug || '').trim() || slugify(nome);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pecas_subcategorias_catalogo')
      .insert({
        categoria_id: categoriaId,
        nome,
        slug,
        ordem: typeof body.ordem === 'number' ? body.ordem : 100,
        ativo: body.ativo !== false,
      })
      .select('*, categoria:pecas_categorias_catalogo(id, nome, slug, grupo_id)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { ok: false, error: 'Já existe uma subcategoria com este nome nesta categoria' },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, subcategoria: data }, { status: 201 });
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
    if (body.categoria_id !== undefined) updateData.categoria_id = String(body.categoria_id).trim();
    if (body.nome !== undefined) updateData.nome = String(body.nome).trim();
    if (body.slug !== undefined) {
      updateData.slug = String(body.slug).trim() || slugify(String(body.nome || ''));
    }
    if (body.ordem !== undefined) updateData.ordem = Number(body.ordem) || 0;
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pecas_subcategorias_catalogo')
      .update(updateData)
      .eq('id', id)
      .select('*, categoria:pecas_categorias_catalogo(id, nome, slug, grupo_id)')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { ok: false, error: 'Já existe uma subcategoria com este nome nesta categoria' },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Subcategoria não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, subcategoria: data });
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
    const { data, error } = await supabase
      .from('pecas_subcategorias_catalogo')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, error: 'Subcategoria não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Subcategoria excluída' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
