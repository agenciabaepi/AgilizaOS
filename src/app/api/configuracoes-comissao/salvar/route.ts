import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dadosCompletos, configuracaoId } = body;

    if (!dadosCompletos || !dadosCompletos.empresa_id) {
      return NextResponse.json(
        { error: 'Dados incompletos. empresa_id é obrigatório.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    let data;
    let error;

    // Se não existe configuração, criar uma nova
    if (!configuracaoId) {
      console.log('📝 Criando nova configuração...');
      const result = await supabase
        .from('configuracoes_comissao')
        .insert(dadosCompletos)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // Atualizar configuração existente
      console.log('📝 Atualizando configuração existente...');
      const result = await supabase
        .from('configuracoes_comissao')
        .update(dadosCompletos)
        .eq('id', configuracaoId)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Erro ao salvar:', error);
      
      let mensagemErro = error.message || 'Erro desconhecido';
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        mensagemErro = 'Erro de permissão. Verifique as políticas RLS da tabela configuracoes_comissao.';
      } else if (error.code === '23505') {
        mensagemErro = 'Já existe uma configuração para esta empresa.';
      }
      
      return NextResponse.json(
        { error: mensagemErro, code: error.code },
        { status: 400 }
      );
    }

    if (!data) {
      console.error('❌ Nenhum dado retornado após salvar');
      return NextResponse.json(
        { error: 'Nenhum dado retornado após salvar' },
        { status: 500 }
      );
    }

    console.log('✅ Configuração salva com sucesso:', data);
    return NextResponse.json({ data, success: true }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Erro ao processar requisição:', error);
    
    // Verificar se é erro de parsing JSON
    if (error.message?.includes('JSON') || error.message?.includes('Unexpected token')) {
      return NextResponse.json(
        { error: 'Erro ao processar dados. Verifique os dados enviados.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
