import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { comissaoId, valorComissao, observacoes, ativa, status } = body;

    if (!comissaoId) {
      return NextResponse.json(
        { error: 'ID da comissão é obrigatório.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Preparar dados para atualização
    const updateData: any = {
      data_calculo: new Date().toISOString()
    };

    // Adicionar campos condicionalmente
    if (valorComissao !== undefined && valorComissao !== null) {
      updateData.valor_comissao = valorComissao;
    }

    if (observacoes !== undefined) {
      updateData.observacoes = observacoes || null;
    }

    if (ativa !== undefined) {
      updateData.ativa = ativa;
    }

    // Status do pagamento: PAGA | CALCULADA | PENDENTE (admin marca comissão como paga)
    if (status !== undefined && status !== null && ['PAGA', 'CALCULADA', 'PENDENTE'].includes(String(status).toUpperCase())) {
      updateData.status = String(status).toUpperCase();
    }

    console.log('💾 Atualizando comissão:', { comissaoId, updateData });

    // Atualizar comissão
    const { data, error } = await supabase
      .from('comissoes_historico')
      .update(updateData)
      .eq('id', comissaoId)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar comissão:', error);
      
      let mensagemErro = error.message || 'Erro desconhecido';
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        mensagemErro = 'Erro de permissão. Verifique as políticas RLS da tabela comissoes_historico.';
      } else if (error.code === 'PGRST116') {
        mensagemErro = 'Comissão não encontrada.';
      }
      
      return NextResponse.json(
        { error: mensagemErro, code: error.code },
        { status: 400 }
      );
    }

    if (!data) {
      console.error('❌ Nenhum dado retornado após atualizar');
      return NextResponse.json(
        { error: 'Nenhum dado retornado após atualizar' },
        { status: 500 }
      );
    }

    console.log('✅ Comissão atualizada com sucesso:', data);
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
