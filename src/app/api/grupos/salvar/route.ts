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
    const id = typeof body.id === 'string' ? body.id : null;

    if (!nome) {
      return NextResponse.json({ error: 'Nome do grupo é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (id) {
      const { data: existente } = await admin
        .from('grupos_produtos')
        .select('id, empresa_id')
        .eq('id', id)
        .maybeSingle();

      if (!existente || existente.empresa_id !== empresaId) {
        return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
      }

      const { data, error } = await admin
        .from('grupos_produtos')
        .update({ nome, descricao: descricao || null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar grupo:', error);
        return NextResponse.json({ error: 'Erro ao atualizar grupo' }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const { data, error } = await admin
      .from('grupos_produtos')
      .insert({
        nome,
        descricao: descricao || null,
        empresa_id: empresaId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar grupo:', error);
      return NextResponse.json({ error: 'Erro ao criar grupo' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/grupos/salvar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
