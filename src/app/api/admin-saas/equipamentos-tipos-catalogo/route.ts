import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { normalizeTipoCodigo } from '@/lib/aparelhos-tipo';

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ativo = searchParams.get('ativo');

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('equipamentos_tipos_catalogo')
      .select('*')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (ativo === 'true') query = query.eq('ativo', true);
    if (ativo === 'false') query = query.eq('ativo', false);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, tipos: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const body = await req.json();
    const codigo = normalizeTipoCodigo(body.codigo || body.nome);
    const nome = String(body.nome || codigo).trim();
    const descricao = body.descricao?.trim() || null;
    const ordem = Number(body.ordem) || 0;

    if (!codigo || !nome) {
      return NextResponse.json({ ok: false, error: 'Código e nome são obrigatórios' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('equipamentos_tipos_catalogo')
      .insert({ codigo, nome, descricao, ordem, ativo: true })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Já existe um tipo com este código' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tipo: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID é obrigatório' }, { status: 400 });

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.codigo !== undefined) updateData.codigo = normalizeTipoCodigo(body.codigo);
    if (body.nome !== undefined) updateData.nome = String(body.nome).trim();
    if (body.descricao !== undefined) updateData.descricao = body.descricao?.trim() || null;
    if (body.ordem !== undefined) updateData.ordem = Number(body.ordem) || 0;
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('equipamentos_tipos_catalogo')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: 'Tipo não encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true, tipo: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID é obrigatório' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('equipamentos_tipos_catalogo')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ ok: false, error: 'Tipo não encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true, message: 'Tipo excluído' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
