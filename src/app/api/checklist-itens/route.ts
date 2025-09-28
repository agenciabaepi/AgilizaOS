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

// GET - Listar itens de checklist
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/checklist-itens - Iniciando...');
    
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const categoria = searchParams.get('categoria');
    const equipamentoCategoria = searchParams.get('equipamento_categoria');
    const ativo = searchParams.get('ativo');

    console.log('🔍 Parâmetros recebidos:', { empresaId, categoria, equipamentoCategoria, ativo });

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
      .from('checklist_itens')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    // Filtros opcionais
    if (ativo !== null && ativo !== '') {
      query = query.eq('ativo', ativo === 'true');
    }

    if (categoria && categoria !== '') {
      query = query.eq('categoria', categoria);
    }

    // ✅ NOVO: Filtrar por categoria de equipamento
    if (equipamentoCategoria && equipamentoCategoria !== '') {
      query = query.eq('equipamento_categoria', equipamentoCategoria);
    }

    console.log('🔍 Executando query...');
    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar itens de checklist:', error);
      return NextResponse.json({ 
        error: 'Erro ao buscar itens de checklist', 
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

    console.log('✅ Itens de checklist encontrados:', data?.length || 0);
    return NextResponse.json({ itens: data || [] }, {
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
    console.error('❌ Erro na API de checklist:', error);
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

// POST - Criar novo item de checklist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 POST /api/checklist-itens - Body recebido:', body);
    
    const { nome, descricao, categoria, equipamento_categoria, empresa_id, ordem, obrigatorio } = body;

    if (!nome || !empresa_id) {
      console.log('❌ Campos obrigatórios faltando:', { nome, empresa_id });
      return NextResponse.json({ 
        error: 'Nome e empresa_id são obrigatórios' 
      }, { status: 400 });
    }

    // Verificar se já existe item com o mesmo nome na empresa
    console.log('🔍 Verificando se item já existe...');
    const client = getSupabaseClient();
    const { data: existing, error: checkError } = await client
      .from('checklist_itens')
      .select('id')
      .eq('nome', nome)
      .eq('empresa_id', empresa_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Erro ao verificar item existente:', checkError);
      return NextResponse.json({ 
        error: 'Erro ao verificar item existente' 
      }, { status: 500 });
    }

    if (existing) {
      console.log('❌ Item já existe:', existing);
      return NextResponse.json({
        error: 'Já existe um item com este nome',
        item: existing
      }, { 
        status: 409,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    console.log('🔍 Inserindo novo item...');
    const { data, error } = await client
      .from('checklist_itens')
      .insert({
        nome,
        descricao: descricao || null,
        categoria: categoria || 'geral',
        equipamento_categoria: equipamento_categoria || null,
        empresa_id,
        ordem: ordem || 0,
        obrigatorio: obrigatorio || false,
        ativo: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar item:', error);
      return NextResponse.json({ error: 'Erro ao criar item' }, { status: 500 });
    }

    console.log('✅ Item criado com sucesso:', data);

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error('Erro na API de checklist:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar item de checklist
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nome, descricao, categoria, equipamento_categoria, ordem, obrigatorio, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (equipamento_categoria !== undefined) updateData.equipamento_categoria = equipamento_categoria;
    if (ordem !== undefined) updateData.ordem = ordem;
    if (obrigatorio !== undefined) updateData.obrigatorio = obrigatorio;
    if (ativo !== undefined) updateData.ativo = ativo;

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('checklist_itens')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar item:', error);
      return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Erro na API de checklist:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Deletar item de checklist
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 DELETE /api/checklist-itens - Iniciando...');
    
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
    console.log('🔍 Deletando item...');
    
    const { error } = await client
      .from('checklist_itens')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar item:', error);
      return NextResponse.json({ error: 'Erro ao deletar item' }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    console.log('✅ Item deletado com sucesso');
    return NextResponse.json({ message: 'Item deletado com sucesso' }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('❌ Erro na API de checklist:', error);
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
