import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

// GET - Buscar configurações de avisos de contas a pagar
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const tipoAlerta = searchParams.get('tipo_alerta'); // 'vencidas' ou 'proximas' ou null para todos

    if (!empresaId) {
      return NextResponse.json({ configs: [] }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    let query = supabase
      .from('config_avisos_contas_pagar')
      .select('*')
      .eq('empresa_id', empresaId);

    if (tipoAlerta) {
      query = query.eq('tipo_alerta', tipoAlerta);
    }

    const { data: configs, error } = await query.order('tipo_alerta', { ascending: true });

    if (error) {
      console.error('Erro ao buscar configurações:', error);
      // Se a tabela não existe, retornar array vazio
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ configs: [] }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
      return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
    }

    return NextResponse.json({ configs: configs || [] }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Erro inesperado:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar configurações' }, { status: 500 });
  }
}

// POST - Criar ou atualizar configuração
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresa_id, tipo_alerta, titulo, descricao, cor_fundo, cor_texto, dias_antecedencia, ativo, exibir_para_todos, usuarios_ids } = body;

    if (!empresa_id || !tipo_alerta) {
      return NextResponse.json({ error: 'empresa_id e tipo_alerta são obrigatórios' }, { status: 400 });
    }

    if (!titulo?.trim() || !descricao?.trim()) {
      return NextResponse.json({ error: 'Título e descrição são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se já existe configuração para este tipo
    const { data: existing } = await supabase
      .from('config_avisos_contas_pagar')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('tipo_alerta', tipo_alerta)
      .single();

    const dadosConfig = {
      empresa_id,
      tipo_alerta,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      cor_fundo: cor_fundo || (tipo_alerta === 'vencidas' ? '#FEE2E2' : '#FEF3C7'),
      cor_texto: cor_texto || (tipo_alerta === 'vencidas' ? '#991B1B' : '#92400E'),
      dias_antecedencia: tipo_alerta === 'proximas' ? (dias_antecedencia !== undefined ? parseInt(String(dias_antecedencia)) : 3) : null,
      ativo: ativo !== undefined ? Boolean(ativo) : true,
      exibir_para_todos: exibir_para_todos !== undefined ? Boolean(exibir_para_todos) : false, // Padrão: false (não exibir para todos)
      usuarios_ids: Array.isArray(usuarios_ids) ? usuarios_ids : [],
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      // Atualizar
      const { data, error } = await supabase
        .from('config_avisos_contas_pagar')
        .update(dadosConfig)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar configuração no banco (POST update):', error);
        return NextResponse.json({ error: error.message || 'Erro ao atualizar configuração' }, { status: 500 });
      }
      result = data;
      console.log('Configuração atualizada no banco (POST update):', { 
        id: result.id, 
        tipo_alerta: result.tipo_alerta, 
        empresa_id: result.empresa_id,
        titulo: result.titulo,
        ativo: result.ativo
      });
    } else {
      // Criar
      const { data, error } = await supabase
        .from('config_avisos_contas_pagar')
        .insert(dadosConfig)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar configuração no banco:', error);
        return NextResponse.json({ error: error.message || 'Erro ao criar configuração' }, { status: 500 });
      }
      result = data;
      console.log('Configuração criada no banco:', { id: result.id, tipo_alerta: result.tipo_alerta, empresa_id: result.empresa_id });
    }

    return NextResponse.json({ config: result }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Erro inesperado:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração' }, { status: 500 });
  }
}

// PUT - Atualizar configuração
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, empresa_id } = body;

    if (!id || !empresa_id) {
      return NextResponse.json({ error: 'ID e empresa_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.titulo !== undefined) updates.titulo = String(body.titulo).trim();
    if (body.descricao !== undefined) updates.descricao = String(body.descricao).trim();
    if (body.cor_fundo !== undefined) updates.cor_fundo = body.cor_fundo;
    if (body.cor_texto !== undefined) updates.cor_texto = body.cor_texto;
    if (body.dias_antecedencia !== undefined && body.tipo_alerta === 'proximas') {
      updates.dias_antecedencia = parseInt(String(body.dias_antecedencia));
    }
    if ('ativo' in body) updates.ativo = Boolean(body.ativo);
    if ('exibir_para_todos' in body) updates.exibir_para_todos = Boolean(body.exibir_para_todos);
    if ('usuarios_ids' in body) {
      updates.usuarios_ids = Array.isArray(body.usuarios_ids) ? body.usuarios_ids : [];
    }

    console.log('PUT - Atualizando configuração:', { id, empresa_id, updates });
    
    const { data: config, error } = await supabase
      .from('config_avisos_contas_pagar')
      .update(updates)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar configuração no banco (PUT):', error);
      return NextResponse.json({ error: error.message || 'Erro ao atualizar configuração' }, { status: 500 });
    }

    console.log('Configuração atualizada no banco (PUT):', { id: config.id, tipo_alerta: config.tipo_alerta, empresa_id: config.empresa_id });
    return NextResponse.json({ config }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar configuração' }, { status: 500 });
  }
}

