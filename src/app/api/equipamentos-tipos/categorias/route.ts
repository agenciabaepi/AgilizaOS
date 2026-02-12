import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não encontradas');
  }
  return createClient(supabaseUrl, supabaseKey);
};

/**
 * GET /api/equipamentos-tipos/categorias?empresa_id=xxx
 * Retorna lista de categorias distintas dos tipos de equipamentos da empresa.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');

    if (!empresaId) {
      return NextResponse.json(
        { error: 'empresa_id é obrigatório', categorias: [] },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('equipamentos_tipos')
      .select('categoria')
      .eq('empresa_id', empresaId)
      .eq('ativo', true);

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar categorias', categorias: [] },
        { status: 500 }
      );
    }

    const seen = new Set<string>();
    const categoriasUnicas = (data || [])
      .map((r) => (r.categoria && String(r.categoria).trim()) || '')
      .filter((c) => c)
      .filter((c) => {
        if (seen.has(c)) return false;
        seen.add(c);
        return true;
      })
      .map((categoria) => ({ categoria }));

    return NextResponse.json({
      categorias: categoriasUnicas,
    });
  } catch (err) {
    console.error('Erro GET /api/equipamentos-tipos/categorias:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Erro interno',
        categorias: [],
      },
      { status: 500 }
    );
  }
}
