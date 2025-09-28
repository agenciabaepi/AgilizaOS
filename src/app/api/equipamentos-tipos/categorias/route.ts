import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente do Supabase não encontradas');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// GET - Listar categorias de equipamentos da empresa
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/equipamentos-tipos/categorias - Iniciando...');
    
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');

    console.log('🔍 Parâmetros recebidos:', { empresaId });

    if (!empresaId) {
      console.log('❌ empresa_id é obrigatório');
      return NextResponse.json({ error: 'empresa_id é obrigatório' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const client = getSupabaseClient();
    
    // Buscar categorias únicas dos equipamentos da empresa
    console.log('🔍 Buscando categorias de equipamentos...');
    const { data, error } = await client
      .from('equipamentos_tipos')
      .select('categoria')
      .eq('empresa_id', empresaId)
      .eq('ativo', true);

    if (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      return NextResponse.json({ 
        error: 'Erro ao buscar categorias de equipamentos', 
        details: error.message 
      }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Extrair categorias únicas
    const categorias = [...new Set(data?.map(item => item.categoria) || [])];
    
    // Buscar contadores para cada categoria
    const categoriasComCount = await Promise.all(
      categorias.map(async (categoria) => {
        const { data: countData } = await client
          .from('equipamentos_tipos')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('categoria', categoria)
          .eq('ativo', true);
        
        // Buscar quantos itens de checklist existem para esta categoria
        const { data: checklistCount } = await client
          .from('checklist_itens')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('equipamento_categoria', categoria)
          .eq('ativo', true);
        
        return {
          categoria,
          total_equipamentos: countData?.length || 0,
          total_checklist: checklistCount?.length || 0
        };
      })
    );

    console.log('✅ Categorias encontradas:', categoriasComCount.length);
    return NextResponse.json({ categorias: categoriasComCount }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('❌ Erro na API de categorias:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}
