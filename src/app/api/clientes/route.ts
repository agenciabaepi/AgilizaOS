import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const search = searchParams.get('search') || '';

    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa ID é obrigatório' }, { status: 400 });
    }

    let query = supabase
      .from('clientes')
      .select('id, nome, telefone, celular, email, documento, numero_cliente')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,telefone.ilike.%${search}%,celular.ilike.%${search}%,documento.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar clientes:', error);
      return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
    }

    return NextResponse.json({ clientes: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 