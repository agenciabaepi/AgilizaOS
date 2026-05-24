import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { normalizeTipoCodigo } from '@/lib/aparelhos-tipo';
import { fetchChecklistCatalogoItens, fetchChecklistEmpresaItens } from '@/lib/checklist-server';
import { mergeChecklistItens } from '@/lib/checklist-merge';

// GET - Listar itens de checklist
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/checklist-itens - Iniciando...');

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
    const categoria = searchParams.get('categoria');
    const equipamentoCategoria = searchParams.get('equipamento_categoria');
    const tipoCatalogoId = searchParams.get('tipo_id');
    const ativo = searchParams.get('ativo');

    console.log('🔍 Parâmetros recebidos:', { empresaId, categoria, equipamentoCategoria, ativo });

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
      return NextResponse.json({ error: 'Acesso negado a dados de outra empresa' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const ativoFilter =
      ativo === 'true' ? true : ativo === 'false' ? false : null;

    console.log('🔍 Executando query...');
    const empresaItens = await fetchChecklistEmpresaItens(admin, {
      empresaId,
      equipamentoCategoria: equipamentoCategoria?.trim() || null,
      ativo: ativoFilter,
      categoriaGrupo: categoria?.trim() || null,
    });
    let itens = empresaItens;

    if (equipamentoCategoria?.trim() || tipoCatalogoId) {
      const catalogoItens = await fetchChecklistCatalogoItens(admin, {
        equipamentoCategoria,
        tipoId: tipoCatalogoId,
      });
      itens = mergeChecklistItens(catalogoItens, empresaItens);
      console.log('✅ Checklist mesclado:', {
        catalogo: catalogoItens.length,
        empresa: empresaItens.length,
        total: itens.length,
        categoria: normalizeTipoCodigo(equipamentoCategoria),
      });
    } else {
      console.log('✅ Itens de checklist encontrados:', empresaItens.length);
    }

    return NextResponse.json(
      { itens },
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
    console.error('❌ Erro na API de checklist:', error);
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

// POST - Criar novo item de checklist
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
    console.log('🔍 POST /api/checklist-itens - Body recebido:', body);

    const { nome, descricao, categoria, equipamento_categoria, empresa_id, ordem, obrigatorio } = body;

    if (!nome || !empresa_id) {
      console.log('❌ Campos obrigatórios faltando:', { nome, empresa_id });
      return NextResponse.json(
        {
          error: 'Nome e empresa_id são obrigatórios',
        },
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(empresa_id)) {
      console.log('❌ empresa_id não é um UUID válido:', empresa_id);
      return NextResponse.json(
        {
          error: 'empresa_id deve ser um UUID válido',
        },
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

    if (empresa_id !== empresaDoUsuario) {
      return NextResponse.json({ error: 'Acesso negado a dados de outra empresa' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    console.log('🔍 Verificando se item já existe na mesma categoria...');

    let dupQuery = admin
      .from('checklist_itens')
      .select('id')
      .eq('nome', nome)
      .eq('empresa_id', empresa_id);

    if (equipamento_categoria) {
      dupQuery = dupQuery.eq('equipamento_categoria', equipamento_categoria);
    } else if (categoria) {
      dupQuery = dupQuery.eq('categoria', categoria);
    }

    const { data: existing, error: checkError } = await dupQuery;

    if (checkError) {
      console.log('❌ Erro ao verificar item existente:', checkError);
      return NextResponse.json(
        {
          error: 'Erro ao verificar item existente',
          details: checkError.message,
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

    if (existing && existing.length > 0) {
      const categoriaInfo = equipamento_categoria
        ? `categoria "${equipamento_categoria}"`
        : categoria
          ? `categoria "${categoria}"`
          : 'empresa';
      console.log('❌ Item já existe:', { nome, empresa_id, equipamento_categoria, categoria });
      return NextResponse.json(
        {
          error: `Item "${nome}" já existe na ${categoriaInfo}`,
          item: existing[0],
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

    console.log('🔍 Inserindo novo item...');

    const insertData: Record<string, unknown> = {
      nome,
      descricao: descricao || null,
      categoria: categoria || 'geral',
      empresa_id: empresaDoUsuario,
      ordem: ordem || 0,
      obrigatorio: obrigatorio || false,
      ativo: true,
    };

    if (equipamento_categoria) {
      insertData.equipamento_categoria = equipamento_categoria;
    }

    const { data, error } = await admin.from('checklist_itens').insert(insertData).select().single();

    if (error) {
      console.error('❌ Erro ao criar item:', error);
      return NextResponse.json(
        {
          error: 'Erro ao criar item',
          details: error.message,
          code: error.code,
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

    console.log('✅ Item criado com sucesso:', data);

    return NextResponse.json(
      { item: data },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('Erro na API de checklist:', error);
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

// PUT - Atualizar item de checklist
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
    const { id, nome, descricao, categoria, equipamento_categoria, ordem, obrigatorio, ativo } = body;

    if (!id) {
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

    const updateData: Record<string, unknown> = {};
    if (nome !== undefined) updateData.nome = nome;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (equipamento_categoria !== undefined) updateData.equipamento_categoria = equipamento_categoria;
    if (ordem !== undefined) updateData.ordem = ordem;
    if (obrigatorio !== undefined) updateData.obrigatorio = obrigatorio;
    if (ativo !== undefined) updateData.ativo = ativo;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('checklist_itens')
      .update(updateData)
      .eq('id', id)
      .eq('empresa_id', empresaDoUsuario)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Erro ao atualizar item:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar item' },
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

    if (!data) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    return NextResponse.json(
      { item: data },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('Erro na API de checklist:', error);
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

// DELETE - Deletar item de checklist
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 DELETE /api/checklist-itens - Iniciando...');

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
    console.log('🔍 Deletando item...');

    const { data: deletedRows, error } = await admin
      .from('checklist_itens')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaDoUsuario)
      .select('id');

    if (error) {
      console.error('❌ Erro ao deletar item:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar item' },
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
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    console.log('✅ Item deletado com sucesso');
    return NextResponse.json(
      { message: 'Item deletado com sucesso' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('❌ Erro na API de checklist:', error);
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
