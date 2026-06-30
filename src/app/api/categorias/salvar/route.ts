import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getEmpresaIdForUser } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : '';
    const grupoId = typeof body.grupo_id === 'string' ? body.grupo_id : '';
    const id = typeof body.id === 'string' ? body.id : null;

    if (!nome) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }

    if (!grupoId) {
      return NextResponse.json({ error: 'Grupo é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: grupo } = await admin
      .from('grupos_produtos')
      .select('id')
      .eq('id', grupoId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (!grupo) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    if (id) {
      const { data: existente } = await admin
        .from('categorias_produtos')
        .select('id, empresa_id')
        .eq('id', id)
        .maybeSingle();

      if (!existente || existente.empresa_id !== empresaId) {
        return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
      }

      const { data, error } = await admin
        .from('categorias_produtos')
        .update({
          nome,
          descricao: descricao || null,
          grupo_id: grupoId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, nome, descricao, grupo_id, empresa_id, created_at')
        .single();

      if (error) {
        console.error('Erro ao atualizar categoria:', error);
        return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const { data, error } = await admin
      .from('categorias_produtos')
      .insert({
        nome,
        descricao: descricao || null,
        grupo_id: grupoId,
        empresa_id: empresaId,
      })
      .select('id, nome, descricao, grupo_id, empresa_id, created_at')
      .single();

    if (error) {
      console.error('Erro ao criar categoria:', error);
      return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/categorias/salvar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
