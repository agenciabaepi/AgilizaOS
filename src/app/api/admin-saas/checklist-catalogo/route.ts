import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { normalizeTipoCodigo } from '@/lib/aparelhos-tipo';

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tipo_id = searchParams.get('tipo_id');
    const equipamento_categoria = searchParams.get('equipamento_categoria');
    const ativo = searchParams.get('ativo');

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('checklist_itens_catalogo')
      .select('*')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    const cat = equipamento_categoria ? normalizeTipoCodigo(equipamento_categoria) : '';
    if (tipo_id && cat) {
      query = query.or(`tipo_id.eq.${tipo_id},equipamento_categoria.eq.${cat}`);
    } else if (tipo_id) {
      query = query.eq('tipo_id', tipo_id);
    } else if (cat) {
      query = query.eq('equipamento_categoria', cat);
    }
    if (ativo === 'true') query = query.eq('ativo', true);
    if (ativo === 'false') query = query.eq('ativo', false);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, itens: data || [] });
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
    const nome = String(body.nome || '').trim();
    const tipo_id = body.tipo_id as string | undefined;
    let equipamento_categoria = normalizeTipoCodigo(body.equipamento_categoria);

    if (!nome || !tipo_id) {
      return NextResponse.json({ ok: false, error: 'Nome e tipo de equipamento são obrigatórios' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (!equipamento_categoria) {
      const { data: tipo } = await supabase
        .from('equipamentos_tipos_catalogo')
        .select('codigo')
        .eq('id', tipo_id)
        .maybeSingle();
      equipamento_categoria = normalizeTipoCodigo(tipo?.codigo);
    }

    if (!equipamento_categoria) {
      return NextResponse.json({ ok: false, error: 'Tipo de equipamento inválido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('checklist_itens_catalogo')
      .insert({
        tipo_id,
        equipamento_categoria,
        nome,
        descricao: body.descricao?.trim() || null,
        categoria: body.categoria || 'geral',
        ordem: Number(body.ordem) || 0,
        obrigatorio: !!body.obrigatorio,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Já existe um item com este nome para o tipo' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: data }, { status: 201 });
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
    if (body.nome !== undefined) updateData.nome = String(body.nome).trim();
    if (body.descricao !== undefined) updateData.descricao = body.descricao?.trim() || null;
    if (body.categoria !== undefined) updateData.categoria = body.categoria;
    if (body.ordem !== undefined) updateData.ordem = Number(body.ordem) || 0;
    if (body.obrigatorio !== undefined) updateData.obrigatorio = !!body.obrigatorio;
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('checklist_itens_catalogo')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: 'Item não encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true, item: data });
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
    const { data, error } = await supabase.from('checklist_itens_catalogo').delete().eq('id', id).select('id');

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ ok: false, error: 'Item não encontrado' }, { status: 404 });

    return NextResponse.json({ ok: true, message: 'Item excluído' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
