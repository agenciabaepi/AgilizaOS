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
    const categoriaId = typeof body.categoria_id === 'string' ? body.categoria_id : '';
    const id = typeof body.id === 'string' ? body.id : null;

    if (!nome) {
      return NextResponse.json({ error: 'Nome da subcategoria é obrigatório' }, { status: 400 });
    }

    if (!categoriaId) {
      return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: categoria } = await admin
      .from('categorias_produtos')
      .select('id')
      .eq('id', categoriaId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (!categoria) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    if (id) {
      const { data: existente } = await admin
        .from('subcategorias_produtos')
        .select('id, empresa_id')
        .eq('id', id)
        .maybeSingle();

      if (!existente || existente.empresa_id !== empresaId) {
        return NextResponse.json({ error: 'Subcategoria não encontrada' }, { status: 404 });
      }

      const { data, error } = await admin
        .from('subcategorias_produtos')
        .update({
          nome,
          descricao: descricao || null,
          categoria_id: categoriaId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, nome, descricao, categoria_id, empresa_id, created_at')
        .single();

      if (error) {
        console.error('Erro ao atualizar subcategoria:', error);
        return NextResponse.json({ error: 'Erro ao atualizar subcategoria' }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const { data, error } = await admin
      .from('subcategorias_produtos')
      .insert({
        nome,
        descricao: descricao || null,
        categoria_id: categoriaId,
        empresa_id: empresaId,
      })
      .select('id, nome, descricao, categoria_id, empresa_id, created_at')
      .single();

    if (error) {
      console.error('Erro ao criar subcategoria:', error);
      return NextResponse.json({ error: 'Erro ao criar subcategoria' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/subcategorias/salvar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
