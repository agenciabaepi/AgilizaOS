import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { applyAparelhoTipoFilter, resolveAparelhoTipo } from '@/lib/aparelhos-tipo';
import { aparelhoImagensApplyToUpdate, aparelhoImagensInsertPayload } from '@/lib/aparelhos-imagens';

function normalizeText(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const ativo = searchParams.get('ativo');
    const busca = searchParams.get('busca');
    const tipo = searchParams.get('tipo');
    const tipo_id = searchParams.get('tipo_id');

    if (!empresaId) {
      return NextResponse.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
    }
    if (empresaId !== empresaDoUsuario) {
      return NextResponse.json({ error: 'Acesso negado a dados de outra empresa' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    let query = admin
      .from('aparelhos_empresa')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('marca', { ascending: true })
      .order('modelo', { ascending: true });

    if (ativo === 'true') query = query.eq('ativo', true);
    if (ativo === 'false') query = query.eq('ativo', false);
    query = applyAparelhoTipoFilter(query, { tipo_id, tipo });
    if (busca) {
      const term = `%${busca.trim()}%`;
      query = query.or(`marca.ilike.${term},modelo.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ aparelhos: data || [] });
  } catch (error) {
    console.error('Erro na API aparelhos-empresa GET:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const body = await request.json();
    const { empresa_id } = body;
    const marca = normalizeText(body.marca);
    const modelo = normalizeText(body.modelo);
    const imagens = aparelhoImagensInsertPayload(body);

    if (!empresa_id || !marca || !modelo) {
      return NextResponse.json({ error: 'empresa_id, marca e modelo são obrigatórios' }, { status: 400 });
    }
    if (empresa_id !== empresaDoUsuario) {
      return NextResponse.json({ error: 'Acesso negado a dados de outra empresa' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const tipoResolved = await resolveAparelhoTipo(admin, {
      tipo_id: body.tipo_id,
      tipo: body.tipo,
    });

    const { data, error } = await admin
      .from('aparelhos_empresa')
      .insert({
        empresa_id,
        marca,
        modelo,
        tipo: tipoResolved.tipo,
        tipo_id: tipoResolved.tipo_id,
        ...imagens,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe um aparelho com esta marca e modelo' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ aparelho: data }, { status: 201 });
  } catch (error) {
    console.error('Erro na API aparelhos-empresa POST:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.marca !== undefined) updateData.marca = normalizeText(body.marca);
    if (body.modelo !== undefined) updateData.modelo = normalizeText(body.modelo);
    aparelhoImagensApplyToUpdate(body, updateData);
    if (body.ativo !== undefined) updateData.ativo = !!body.ativo;

    const admin = getSupabaseAdmin();
    if (body.tipo !== undefined || body.tipo_id !== undefined) {
      const tipoResolved = await resolveAparelhoTipo(admin, {
        tipo_id: body.tipo_id,
        tipo: body.tipo,
      });
      updateData.tipo = tipoResolved.tipo;
      updateData.tipo_id = tipoResolved.tipo_id;
    }

    const { data, error } = await admin
      .from('aparelhos_empresa')
      .update(updateData)
      .eq('id', id)
      .eq('empresa_id', empresaDoUsuario)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Aparelho não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ aparelho: data });
  } catch (error) {
    console.error('Erro na API aparelhos-empresa PUT:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('aparelhos_empresa')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaDoUsuario)
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ error: 'Aparelho não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Aparelho excluído com sucesso' });
  } catch (error) {
    console.error('Erro na API aparelhos-empresa DELETE:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
