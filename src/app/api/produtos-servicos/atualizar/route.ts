import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase-config';

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produtoId = searchParams.get('produtoId');
    
    if (!produtoId) {
      return NextResponse.json({ error: 'produtoId é obrigatório' }, { status: 400 });
    }

    const body = await request.json();

    // Filtrar campos válidos e tratar valores
    const updateData: any = {};
    
    Object.keys(body).forEach(key => {
      const value = body[key];
      
      // Incluir campos que não são undefined
      if (value !== undefined) {
        // Converter strings vazias para null para campos opcionais
        if (value === '' && ['grupo_id', 'categoria_id', 'subcategoria_id', 'fornecedor_id', 'ncm', 'cfop', 'cst', 'cest', 'marca', 'obs', 'fornecedor', 'grupo', 'categoria', 'subcategoria'].includes(key)) {
          updateData[key] = null;
        } else {
          updateData[key] = value;
        }
      }
    });

    // Garantir que todos os campos principais estejam presentes
    const camposObrigatorios = [
      'nome', 'tipo', 'preco', 'custo', 'estoque_atual', 'unidade', 'ativo', 
      'codigo', 'codigo_barras', 'marca', 'estoque_min', 'estoque_max', 
      'situacao', 'ncm', 'cfop', 'cst', 'cest', 'largura_cm', 'altura_cm', 
      'profundidade_cm', 'peso_g', 'obs', 'imagens', 'imagens_url',
      'grupo_id', 'categoria_id', 'subcategoria_id', 'fornecedor_id',
      'grupo', 'categoria', 'subcategoria', 'fornecedor'
    ];

    // Adicionar campos que podem estar faltando com valores padrão
    camposObrigatorios.forEach(campo => {
      if (!(campo in updateData)) {
        if (['grupo_id', 'categoria_id', 'subcategoria_id', 'fornecedor_id', 'grupo', 'categoria', 'subcategoria', 'fornecedor', 'ncm', 'cfop', 'cst', 'cest', 'marca', 'obs'].includes(campo)) {
          updateData[campo] = null;
        } else if (['preco', 'custo', 'estoque_atual', 'estoque_min', 'estoque_max', 'largura_cm', 'altura_cm', 'profundidade_cm', 'peso_g'].includes(campo)) {
          updateData[campo] = 0;
        } else if (campo === 'ativo') {
          updateData[campo] = true;
        } else if (campo === 'imagens_url') {
          updateData[campo] = [];
        } else if (campo === 'imagens') {
          updateData[campo] = [];
        } else {
          updateData[campo] = '';
        }
      }
    });


    const response = await fetch(`${supabaseConfig.url}/rest/v1/produtos_servicos?id=eq.${produtoId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseConfig.serviceRoleKey,
        'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Supabase:', response.status, response.statusText, errorText);
      return NextResponse.json({ 
        error: 'Erro ao atualizar produto', 
        details: errorText,
        status: response.status 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erro na API atualizar produto:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
