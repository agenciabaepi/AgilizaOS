import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

// GET - Listar avisos ativos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const todos = searchParams.get('todos'); // Parâmetro para retornar todos os avisos (admin)

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
    
    console.log('[API] Query - empresaId recebido:', empresaId, 'tipo:', typeof empresaId)
    console.log('[API] Query - todos:', todos, 'todos === "true":', todos === 'true')
    
    // Buscar avisos - construir query baseado no parâmetro 'todos'
    let queryBuilder = supabase
      .from('avisos_sistema')
      .select('*')
      .eq('empresa_id', empresaId);
    
    // Se não for "todos", filtrar apenas os ativos (para o banner)
    if (todos !== 'true') {
      queryBuilder = queryBuilder.eq('ativo', true);
      console.log('[API] Filtrando apenas avisos ativos (banner)')
    } else {
      console.log('[API] Retornando TODOS os avisos (admin page) - SEM filtrar por ativo')
    }
    
    // Aplicar ordenação
    queryBuilder = queryBuilder
      .order('prioridade', { ascending: false })
      .order('created_at', { ascending: false });
    
    // Buscar avisos
    const { data: avisos, error } = await queryBuilder;

    console.log('[API] GET /avisos - empresaId:', empresaId, 'todos:', todos)
    console.log('[API] GET /avisos - Resultado ANTES do filtro de datas:', {
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
        return NextResponse.json({ avisos: [] });
      }
      return NextResponse.json({ error: 'Erro ao buscar avisos' }, { status: 500 });
    }

    // Filtrar por datas apenas se não for "todos" (para o banner, não para a página de admin)
    let avisosFiltrados = avisos || [];
    if (todos !== 'true') {
      console.log('[API] Filtrando por datas (banner)')
      const agora = new Date();
      avisosFiltrados = (avisos || []).filter((aviso: any) => {
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
        return true;
      });
    } else {
      console.log('[API] NÃO filtrando por datas (admin page) - retornando TODOS')
    }

    console.log('[API] GET /avisos - Resultado FINAL:', {
      quantidade: avisosFiltrados?.length || 0,
      avisos: avisosFiltrados?.map((a: any) => ({ 
        id: a.id, 
        titulo: a.titulo, 
        ativo: a.ativo,
        empresa_id: a.empresa_id
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
    return NextResponse.json({ avisos: [] });
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

    console.log('[API] POST /avisos - Body recebido:', {
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
    
    console.log('[API] POST /avisos - empresaIdFinal que será usado:', empresaIdFinal)

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
    }
    
    console.log('[API] POST /avisos - Dados que serão inseridos:', {
      ...dadosParaInserir,
      empresa_id: dadosParaInserir.empresa_id
    })

    const { data: aviso, error } = await supabase
      .from('avisos_sistema')
      .insert(dadosParaInserir)
      .select()
      .single();
    
    console.log('[API] POST /avisos - Resultado da inserção:', {
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