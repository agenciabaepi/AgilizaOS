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
    const incluirInativos = searchParams.get('incluir_inativos') === 'true';

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('pecas_fornecedores_catalogo')
      .select('*')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (!incluirInativos) query = query.eq('ativo', true);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fornecedores: data || [] });
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
    const nome = String(body.nome || '').trim();
    if (!nome) {
      return NextResponse.json({ ok: false, error: 'Nome é obrigatório' }, { status: 400 });
    }

    const slug = String(body.slug || '').trim() || slugify(nome);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pecas_fornecedores_catalogo')
      .insert({
        nome,
        slug,
        imagem_url: body.imagem_url ? String(body.imagem_url).trim() : null,
        ordem: typeof body.ordem === 'number' ? body.ordem : 100,
        ativo: body.ativo !== false,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { ok: false, error: 'Já existe um fornecedor com este nome' },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fornecedor: data }, { status: 201 });
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
    if (body.nome !== undefined) updateData.nome = String(body.nome).trim();
    if (body.slug !== undefined) {
      updateData.slug = String(body.slug).trim() || slugify(String(body.nome || ''));
    }
    if (body.imagem_url !== undefined) {
      updateData.imagem_url = body.imagem_url ? String(body.imagem_url).trim() : null;
    }
    if (body.ordem !== undefined) updateData.ordem = Number(body.ordem) || 0;
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pecas_fornecedores_catalogo')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { ok: false, error: 'Já existe um fornecedor com este nome' },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    // Mantém o campo texto marca espelhado nas peças vinculadas
    if (body.nome !== undefined && data.nome) {
      await supabase
        .from('pecas_catalogo')
        .update({ marca: data.nome, updated_at: new Date().toISOString() })
        .eq('fornecedor_id', id);
    }

    return NextResponse.json({ ok: true, fornecedor: data });
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
      .from('pecas_fornecedores_catalogo')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Fornecedor excluído' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
