import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { resolveAparelhoTipo } from '@/lib/aparelhos-tipo';
import {
  buildAparelhoImagensUpdate,
  insertAparelhoCatalogo,
  updateAparelhoCatalogo,
} from '@/lib/aparelhos-persist-db';

function normalizeText(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ativo = searchParams.get('ativo');
    const busca = searchParams.get('busca');
    const marca = searchParams.get('marca');

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('aparelhos_catalogo')
      .select('*')
      .order('modelo', { ascending: true });

    if (ativo === 'true') query = query.eq('ativo', true);
    if (ativo === 'false') query = query.eq('ativo', false);
    if (marca?.trim()) query = query.eq('marca', marca.trim().toUpperCase());

    if (busca) {
      const term = `%${busca.trim()}%`;
      query = query.or(`marca.ilike.${term},modelo.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, aparelhos: data || [] });
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
    const marca = normalizeText(body.marca);
    const modelo = normalizeText(body.modelo);
    if (!marca || !modelo) {
      return NextResponse.json({ ok: false, error: 'Marca e modelo são obrigatórios' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const tipoResolved = await resolveAparelhoTipo(supabase, {
      tipo_id: body.tipo_id,
      tipo: body.tipo,
    });

    const { data, error } = await insertAparelhoCatalogo(supabase, {
      marca,
      modelo,
      tipo: tipoResolved.tipo,
      tipo_id: tipoResolved.tipo_id,
      imagem_url: body.imagem_url,
      imagem_frente_url: body.imagem_frente_url,
      imagem_verso_url: body.imagem_verso_url,
      ativo: true,
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Já existe um aparelho com esta marca e modelo' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, aparelho: data }, { status: 201 });
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

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      ...buildAparelhoImagensUpdate(body),
    };
    if (body.marca !== undefined) updateData.marca = normalizeText(body.marca);
    if (body.modelo !== undefined) updateData.modelo = normalizeText(body.modelo);
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;

    const supabase = getSupabaseAdmin();
    if (body.tipo !== undefined || body.tipo_id !== undefined) {
      const tipoResolved = await resolveAparelhoTipo(supabase, {
        tipo_id: body.tipo_id,
        tipo: body.tipo,
      });
      updateData.tipo = tipoResolved.tipo;
      updateData.tipo_id = tipoResolved.tipo_id;
    }

    const { data, error } = await updateAparelhoCatalogo(supabase, id, updateData);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Aparelho não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, aparelho: data });
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
      .from('aparelhos_catalogo')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, error: 'Aparelho não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Aparelho excluído' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
