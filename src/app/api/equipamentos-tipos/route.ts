import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';

// GET - Listar tipos de equipamentos
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/equipamentos-tipos - Iniciando...');

    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const ativo = searchParams.get('ativo');
    const categoria = searchParams.get('categoria');

    console.log('🔍 Parâmetros recebidos:', { empresaId, ativo, categoria });

    if (!empresaId) {
      console.log('❌ empresa_id é obrigatório');
      return NextResponse.json(
        { error: 'empresa_id é obrigatório' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    if (empresaId !== empresaDoUsuario) {
      return NextResponse.json(
        { error: 'Acesso negado a dados de outra empresa' },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    let query = admin
      .from('equipamentos_tipos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

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
      return NextResponse.json(
        {
          error: 'Erro ao buscar equipamentos',
          details: error.message,
        },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    console.log('✅ Equipamentos encontrados:', data?.length || 0);
    return NextResponse.json(
      { equipamentos: data || [] },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('❌ Erro na API de equipamentos:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

// POST - Criar novo tipo de equipamento
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const body = await request.json();
    console.log('🔍 POST /api/equipamentos-tipos - Body recebido:', body);

    const { nome, categoria, descricao, empresa_id } = body;

    if (!nome || !categoria || !empresa_id) {
      console.log('❌ Campos obrigatórios faltando:', { nome, categoria, empresa_id });
      return NextResponse.json(
        {
          error: 'Nome, categoria e empresa_id são obrigatórios',
        },
        { status: 400 }
      );
    }

    if (empresa_id !== empresaDoUsuario) {
      return NextResponse.json({ error: 'Acesso negado a dados de outra empresa' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    console.log('🔍 Verificando se equipamento já existe...');
    const { data: existing, error: checkError } = await admin
      .from('equipamentos_tipos')
      .select('id')
      .eq('nome', nome)
      .eq('empresa_id', empresa_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Erro ao verificar equipamento existente:', checkError);
      return NextResponse.json(
        {
          error: 'Erro ao verificar equipamento existente',
        },
        { status: 500 }
      );
    }

    if (existing) {
      console.log('❌ Equipamento já existe:', existing);
      return NextResponse.json(
        {
          error: 'Já existe um equipamento com este nome',
          equipamento: existing,
        },
        {
          status: 409,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    console.log('🔍 Inserindo novo equipamento...');
    const { data, error } = await admin
      .from('equipamentos_tipos')
      .insert({
        nome,
        categoria,
        descricao: descricao || null,
        empresa_id,
        ativo: true,
        quantidade_cadastrada: 0,
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
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const body = await request.json();
    const { id, nome, categoria, descricao, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (nome !== undefined) updateData.nome = nome;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (ativo !== undefined) updateData.ativo = ativo;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('equipamentos_tipos')
      .update(updateData)
      .eq('id', id)
      .eq('empresa_id', empresaDoUsuario)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Erro ao atualizar equipamento:', error);
      return NextResponse.json({ error: 'Erro ao atualizar equipamento' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 });
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

    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🔍 ID para deletar:', id);

    if (!id) {
      console.log('❌ ID é obrigatório');
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    const admin = getSupabaseAdmin();
    console.log('🔍 Deletando equipamento...');

    const { data: deletedRows, error } = await admin
      .from('equipamentos_tipos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaDoUsuario)
      .select('id');

    if (error) {
      console.error('❌ Erro ao deletar equipamento:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar equipamento' },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    if (!deletedRows?.length) {
      return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 });
    }

    console.log('✅ Equipamento deletado com sucesso');
    return NextResponse.json(
      { message: 'Equipamento deletado com sucesso' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('❌ Erro na API de equipamentos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}
