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

// GET - Listar tipos de equipamentos
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/equipamentos-tipos - Iniciando...');
    
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const ativo = searchParams.get('ativo');
    const categoria = searchParams.get('categoria');

    console.log('🔍 Parâmetros recebidos:', { empresaId, ativo, categoria });

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
    let query = client
      .from('equipamentos_tipos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    // Filtros opcionais
    if (ativo !== null && ativo !== '') {
      query = query.eq('ativo', ativo === 'true');
    }

    if (categoria && categoria !== '') {
      query = query.eq('categoria', categoria);
    }

    console.log('🔍 Executando query...');
    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar equipamentos:', error);
      return NextResponse.json({ 
        error: 'Erro ao buscar equipamentos', 
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

    console.log('✅ Equipamentos encontrados:', data?.length || 0);
    return NextResponse.json({ equipamentos: data || [] }, {
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
    console.error('❌ Erro na API de equipamentos:', error);
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

// POST - Criar novo tipo de equipamento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 POST /api/equipamentos-tipos - Body recebido:', body);
    
    const { nome, categoria, descricao, empresa_id } = body;

    if (!nome || !categoria || !empresa_id) {
      console.log('❌ Campos obrigatórios faltando:', { nome, categoria, empresa_id });
      return NextResponse.json({ 
        error: 'Nome, categoria e empresa_id são obrigatórios' 
      }, { status: 400 });
    }

    // Verificar se já existe
    console.log('🔍 Verificando se equipamento já existe...');
    const client = getSupabaseClient();
    const { data: existing, error: checkError } = await client
      .from('equipamentos_tipos')
      .select('id')
      .eq('nome', nome)
      .eq('empresa_id', empresa_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Erro ao verificar equipamento existente:', checkError);
      return NextResponse.json({ 
        error: 'Erro ao verificar equipamento existente' 
      }, { status: 500 });
    }

        if (existing) {
          console.log('❌ Equipamento já existe:', existing);
          return NextResponse.json({
            error: 'Já existe um equipamento com este nome',
            equipamento: existing
          }, { 
            status: 409,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          });
        }

    console.log('🔍 Inserindo novo equipamento...');
    const { data, error } = await client
      .from('equipamentos_tipos')
      .insert({
        nome,
        categoria,
        descricao: descricao || null,
        empresa_id,
        ativo: true,
        quantidade_cadastrada: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar equipamento:', error);
      return NextResponse.json({ error: 'Erro ao criar equipamento' }, { status: 500 });
    }

    console.log('✅ Equipamento criado com sucesso:', data);

    return NextResponse.json({ equipamento: data }, { status: 201 });
  } catch (error) {
    console.error('Erro na API de equipamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar tipo de equipamento
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nome, categoria, descricao, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (ativo !== undefined) updateData.ativo = ativo;

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('equipamentos_tipos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar equipamento:', error);
      return NextResponse.json({ error: 'Erro ao atualizar equipamento' }, { status: 500 });
    }

    return NextResponse.json({ equipamento: data });
  } catch (error) {
    console.error('Erro na API de equipamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Deletar tipo de equipamento
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 DELETE /api/equipamentos-tipos - Iniciando...');
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🔍 ID para deletar:', id);

    if (!id) {
      console.log('❌ ID é obrigatório');
      return NextResponse.json({ error: 'ID é obrigatório' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const client = getSupabaseClient();
    console.log('🔍 Deletando equipamento...');
    
    const { error } = await client
      .from('equipamentos_tipos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar equipamento:', error);
      return NextResponse.json({ error: 'Erro ao deletar equipamento' }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    console.log('✅ Equipamento deletado com sucesso');
    return NextResponse.json({ message: 'Equipamento deletado com sucesso' }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('❌ Erro na API de equipamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}
