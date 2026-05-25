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

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('cores_catalogo')
      .select('*')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (!incluirInativas) query = query.eq('ativo', true);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cores: data || [] });
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
      return NextResponse.json({ ok: false, error: 'Nome da cor é obrigatório' }, { status: 400 });
    }

    const hex = body.hex ? String(body.hex).trim() : null;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('cores_catalogo')
      .insert({
        nome,
        hex,
        ordem: typeof body.ordem === 'number' ? body.ordem : 500,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Esta cor já está cadastrada' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cor: data }, { status: 201 });
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
    if (body.hex !== undefined) updateData.hex = body.hex ? String(body.hex).trim() : null;
    if (body.ordem !== undefined) updateData.ordem = Number(body.ordem) || 0;
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('cores_catalogo')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Cor não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, cor: data });
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
    const { data, error } = await supabase.from('cores_catalogo').delete().eq('id', id).select('id');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, error: 'Cor não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Cor excluída' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
