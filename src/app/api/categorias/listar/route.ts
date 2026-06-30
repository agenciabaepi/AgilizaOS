import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('categorias_produtos')
      .select('id, nome, descricao, grupo_id, empresa_id, created_at')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar categorias:', error);
      return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET categorias/listar:', e);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
