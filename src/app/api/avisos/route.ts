import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    debugLog(...args);
  }
};

// GET - Listar avisos ativos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const todos = searchParams.get('todos'); // Parâmetro para retornar todos os avisos (admin)
    const usuarioId = searchParams.get('usuario_id'); // ID do usuário logado (para filtrar avisos)

    if (!empresaId) {
      return NextResponse.json({ avisos: [] }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    const supabase = createAdminClient();
    
    debugLog('[API] Query - empresaId recebido:', empresaId, 'tipo:', typeof empresaId)
    debugLog('[API] Query - todos:', todos, 'todos === "true":', todos === 'true')
    
    // Buscar avisos - construir query baseado no parâmetro 'todos'
    let queryBuilder = supabase
      .from('avisos_sistema')
      .select('*')
      .eq('empresa_id', empresaId);
    
    // Se não for "todos", filtrar apenas os ativos (para o banner)
    if (todos !== 'true') {
      queryBuilder = queryBuilder.eq('ativo', true);
      debugLog('[API] Filtrando apenas avisos ativos (banner)')
    } else {
      debugLog('[API] Retornando TODOS os avisos (admin page) - SEM filtrar por ativo')
    }
    
    // Aplicar ordenação
    queryBuilder = queryBuilder
      .order('prioridade', { ascending: false })
      .order('created_at', { ascending: false });
    
    // Buscar avisos
    const { data: avisos, error } = await queryBuilder;

    debugLog('[API] GET /avisos - empresaId:', empresaId, 'todos:', todos)
    debugLog('[API] GET /avisos - Resultado ANTES do filtro de datas:', {
      quantidade: avisos?.length || 0,
      avisos: avisos?.map((a: any) => ({ 
        id: a.id, 
        titulo: a.titulo, 
        ativo: a.ativo, 
        empresa_id: a.empresa_id,
        data_inicio: a.data_inicio,
        data_fim: a.data_fim
      })) || [],
      error: error?.message
    })

    if (error) {
      console.error('GET /api/avisos - Erro do Supabase:', error);
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ avisos: [] }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
      return NextResponse.json({ error: 'Erro ao buscar avisos' }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Filtrar por datas apenas se não for "todos" (para o banner, não para a página de admin)
    let avisosFiltrados = avisos || [];
    if (todos !== 'true') {
      debugLog('[API] Filtrando por datas e usuário (banner)')
      const agora = new Date();
      avisosFiltrados = (avisos || []).filter((aviso: any) => {
        // Filtrar por data
        if (aviso.data_inicio) {
          const inicio = new Date(aviso.data_inicio);
          if (inicio > agora) {
            return false;
          }
        }
        if (aviso.data_fim) {
          const fim = new Date(aviso.data_fim);
          if (fim < agora) {
            return false;
          }
        }
        
        // Filtrar por usuário
        // Se o aviso é "para todos", mostrar independente de ter usuarioId ou não
        if (aviso.exibir_para_todos === true) {
          return true;
        }
        
        // Se o aviso NÃO é "para todos", só mostrar se:
        // 1. Há um usuarioId (usuário logado)
        // 2. E o usuarioId está na lista de usuarios_ids
        if (aviso.exibir_para_todos === false) {
          if (!usuarioId) {
            // Se não há usuarioId, não mostrar avisos específicos
            debugLog('[API] Aviso específico para usuários mas não há usuarioId - não mostrar')
            return false;
          }
          
          // Obter a lista de IDs do aviso
          let usuariosIds: any[] = [];
          if (Array.isArray(aviso.usuarios_ids)) {
            usuariosIds = aviso.usuarios_ids;
          } else if (aviso.usuarios_ids) {
            // Se vier como string do PostgreSQL array, fazer parse
            try {
              usuariosIds = typeof aviso.usuarios_ids === 'string' 
                ? JSON.parse(aviso.usuarios_ids.replace(/{/g, '[').replace(/}/g, ']'))
                : [aviso.usuarios_ids];
            } catch {
              usuariosIds = [];
            }
          }
          
          // Normalizar IDs para comparação (remover espaços, converter para string e lowercase)
          // UUIDs devem estar no formato padrão: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          const normalizarUUID = (id: any): string => {
            if (!id) return '';
            let str = String(id).trim().toLowerCase();
            // Remover espaços extras
            str = str.replace(/\s+/g, '');
            // Se não tem hífens mas tem 32 caracteres, adicionar hífens no formato UUID padrão
            if (str.length === 32 && !str.includes('-')) {
              str = `${str.substring(0, 8)}-${str.substring(8, 12)}-${str.substring(12, 16)}-${str.substring(16, 20)}-${str.substring(20, 32)}`;
            }
            return str;
          };
          
          const usuarioIdNormalizado = normalizarUUID(usuarioId);
          const usuariosIdsNormalizados = usuariosIds.map((id: any) => normalizarUUID(id)).filter((id: string) => id.length > 0);
          
          const usuarioEstaNaLista = usuariosIdsNormalizados.includes(usuarioIdNormalizado);
          
          debugLog('[API] Verificando se usuário está na lista:', {
            aviso_id: aviso.id,
            aviso_titulo: aviso.titulo,
            usuarioId_original: usuarioId,
            usuarioId_normalizado: usuarioIdNormalizado,
            usuarios_ids_original: aviso.usuarios_ids,
            usuarios_ids_processado: usuariosIds,
            usuarios_ids_normalizados: usuariosIdsNormalizados,
            usuarioEstaNaLista,
            tipo_usuarioId: typeof usuarioId,
            tipo_usuarios_ids: typeof aviso.usuarios_ids,
            is_array: Array.isArray(aviso.usuarios_ids)
          })
          
          return usuarioEstaNaLista;
        }
        
        // Fallback: se exibir_para_todos for null/undefined, tratar como "para todos" (compatibilidade)
        return true;
      });
    } else {
      debugLog('[API] NÃO filtrando por datas (admin page) - retornando TODOS')
    }

    debugLog('[API] GET /avisos - Resultado FINAL:', {
      quantidade: avisosFiltrados?.length || 0,
      usuarioId: usuarioId || 'não fornecido',
      avisos: avisosFiltrados?.map((a: any) => ({ 
        id: a.id, 
        titulo: a.titulo, 
        ativo: a.ativo,
        empresa_id: a.empresa_id,
        exibir_para_todos: a.exibir_para_todos,
        usuarios_ids: a.usuarios_ids
      })) || []
    })

    // Desabilitar cache completamente para esta rota
    return NextResponse.json({ avisos: avisosFiltrados }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ avisos: [] }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

// POST - Criar novo aviso
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'JSON inválido na requisição' }, { status: 400 });
    }
    
    const { titulo, mensagem, empresa_id } = body;

    debugLog('[API] POST /avisos - Body recebido:', {
      titulo,
      empresa_id,
      empresa_id_tipo: typeof empresa_id,
      empresa_id_length: empresa_id?.length
    })

    if (!titulo?.trim()) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    if (!mensagem?.trim()) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    if (!empresa_id) {
      console.error('[API] POST /avisos - empresa_id não fornecido no body!')
      return NextResponse.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
    }
    
    // Garantir que empresa_id é uma string válida
    const empresaIdFinal = String(empresa_id).trim()
    if (!empresaIdFinal || empresaIdFinal === 'undefined' || empresaIdFinal === 'null') {
      console.error('[API] POST /avisos - empresa_id inválido:', empresa_id)
      return NextResponse.json({ error: 'empresa_id inválido' }, { status: 400 });
    }
    
    debugLog('[API] POST /avisos - empresaIdFinal que será usado:', empresaIdFinal)

    const supabase = createAdminClient();

    const dadosParaInserir = {
      empresa_id: empresaIdFinal, // Usar o empresaIdFinal validado
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      tipo: body.tipo || 'info',
      cor_fundo: body.cor_fundo || '#EF4444',
      cor_texto: body.cor_texto || '#FFFFFF',
      prioridade: parseInt(String(body.prioridade || 0)),
      data_inicio: body.data_inicio || null,
      data_fim: body.data_fim || null,
      ativo: body.ativo !== undefined ? body.ativo : true,
      exibir_para_todos: body.exibir_para_todos !== undefined ? body.exibir_para_todos : false, // Padrão: false (não exibir para todos)
      usuarios_ids: Array.isArray(body.usuarios_ids) ? body.usuarios_ids : [],
    }
    
    debugLog('[API] POST /avisos - Dados que serão inseridos:', {
      ...dadosParaInserir,
      empresa_id: dadosParaInserir.empresa_id
    })

    const { data: aviso, error } = await supabase
      .from('avisos_sistema')
      .insert(dadosParaInserir)
      .select()
      .single();
    
    debugLog('[API] POST /avisos - Resultado da inserção:', {
      sucesso: !error,
      aviso_id: aviso?.id,
      aviso_empresa_id: aviso?.empresa_id,
      error: error?.message
    })

    if (error) {
      console.error('Erro do Supabase:', error);
      return NextResponse.json({ error: error.message || 'Erro ao criar aviso', details: error }, { status: 500 });
    }

    return NextResponse.json({ aviso });
  } catch (error: any) {
    console.error('Erro inesperado:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar aviso' }, { status: 500 });
  }
}

// PUT - Atualizar aviso
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { id, empresa_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    if (!empresa_id) {
      return NextResponse.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.titulo !== undefined) updates.titulo = String(body.titulo).trim();
    if (body.mensagem !== undefined) updates.mensagem = String(body.mensagem).trim();
    if (body.tipo !== undefined) updates.tipo = body.tipo;
    if (body.cor_fundo !== undefined) updates.cor_fundo = body.cor_fundo;
    if (body.cor_texto !== undefined) updates.cor_texto = body.cor_texto;
    if (body.prioridade !== undefined) updates.prioridade = parseInt(String(body.prioridade || 0));
    if ('ativo' in body) {
      updates.ativo = Boolean(body.ativo);
    }
    
    // Datas: aceitar null para limpar ou string ISO
    // Usar 'in' operator para verificar se a chave existe no body, mesmo que seja null
    if ('data_inicio' in body) {
      updates.data_inicio = body.data_inicio === null || body.data_inicio === '' ? null : body.data_inicio;
    }
    if ('data_fim' in body) {
      updates.data_fim = body.data_fim === null || body.data_fim === '' ? null : body.data_fim;
    }
    
    // Campos de seleção de usuários
    if ('exibir_para_todos' in body) {
      updates.exibir_para_todos = Boolean(body.exibir_para_todos);
    }
    if ('usuarios_ids' in body) {
      updates.usuarios_ids = Array.isArray(body.usuarios_ids) ? body.usuarios_ids : [];
    }

    const { data: aviso, error } = await supabase
      .from('avisos_sistema')
      .update(updates)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Erro ao atualizar aviso' }, { status: 500 });
    }

    return NextResponse.json({ aviso });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar aviso' }, { status: 500 });
  }
}

// DELETE - Deletar aviso
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const empresa_id = searchParams.get('empresa_id');

    if (!id || !empresa_id) {
      return NextResponse.json({ error: 'ID e empresa_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('avisos_sistema')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) {
      return NextResponse.json({ error: error.message || 'Erro ao deletar aviso' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao deletar aviso' }, { status: 500 });
  }
}