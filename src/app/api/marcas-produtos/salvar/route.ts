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

    if (!nome) {
      return NextResponse.json({ error: 'Nome da marca é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: existente } = await admin
      .from('marcas_produtos')
      .select('id, nome')
      .eq('empresa_id', empresaId)
      .ilike('nome', nome)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(existente);
    }

    const { data, error } = await admin
      .from('marcas_produtos')
      .insert({
        nome,
        empresa_id: empresaId,
      })
      .select('id, nome')
      .single();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ id: nome, nome });
      }
      console.error('Erro ao criar marca:', error);
      return NextResponse.json({ error: 'Erro ao criar marca' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/marcas-produtos/salvar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
