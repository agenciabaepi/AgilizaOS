import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

function normalizeNome(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const incluirInativas = searchParams.get('incluir_inativas') === 'true';
    const comContagem = searchParams.get('com_contagem') !== 'false';

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('marcas_catalogo')
      .select('*')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (!incluirInativas) query = query.eq('ativo', true);

    const { data: marcas, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!comContagem || !marcas?.length) {
      return NextResponse.json({ ok: true, marcas: marcas || [] });
    }

    const { data: aparelhos, error: apError } = await supabase
      .from('aparelhos_catalogo')
      .select('marca');

    if (apError) {
      return NextResponse.json({ ok: false, error: apError.message }, { status: 500 });
    }

    const contagem = new Map<string, number>();
    for (const a of aparelhos || []) {
      const m = String(a.marca || '').trim().toUpperCase();
      if (m) contagem.set(m, (contagem.get(m) || 0) + 1);
    }

    const marcasComContagem = marcas.map((m) => ({
      ...m,
      total_aparelhos: contagem.get(m.nome) || 0,
    }));

    return NextResponse.json({ ok: true, marcas: marcasComContagem });
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
    const nome = normalizeNome(body.nome);
    if (!nome) {
      return NextResponse.json({ ok: false, error: 'Nome da marca é obrigatório' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('marcas_catalogo')
      .insert({
        nome,
        ordem: typeof body.ordem === 'number' ? body.ordem : 500,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Esta marca já está cadastrada' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, marca: data }, { status: 201 });
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
    if (body.nome !== undefined) updateData.nome = normalizeNome(body.nome);
    if (body.ordem !== undefined) updateData.ordem = Number(body.ordem) || 0;
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('marcas_catalogo')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Marca não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, marca: data });
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
      .from('marcas_catalogo')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, error: 'Marca não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Marca excluída' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
