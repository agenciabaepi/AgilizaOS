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

    // Saque de comissão "prevista" (OS já entregue mas sem registro em comissoes_historico): criar registro já como PAGA
    const statusSolicitado = (status !== undefined && status !== null && String(status).toUpperCase() === 'PAGA') ? 'PAGA' : null;
    if (typeof comissaoId === 'string' && comissaoId.startsWith('prevista-') && statusSolicitado === 'PAGA') {
      const ordemServicoId = comissaoId.replace(/^prevista-/, '');
      const { data: os } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, tecnico_id, cliente_id, empresa_id, valor_faturado, valor_servico, valor_peca, data_entrega, tipo')
        .eq('id', ordemServicoId)
        .single();
      if (!os) {
        return NextResponse.json({ error: 'Ordem de serviço não encontrada.' }, { status: 404 });
      }
      const tecnicoIdOs = os.tecnico_id;
      let tecnicoData: { id: string; tipo_comissao?: string; comissao_fixa?: number; comissao_percentual?: number } | null = null;
      const byId = await supabase.from('usuarios').select('id, tipo_comissao, comissao_fixa, comissao_percentual').eq('id', tecnicoIdOs).maybeSingle();
      if (byId.data) tecnicoData = byId.data;
      if (!tecnicoData) {
        const byAuth = await supabase.from('usuarios').select('id, tipo_comissao, comissao_fixa, comissao_percentual').eq('auth_user_id', tecnicoIdOs).maybeSingle();
        if (byAuth.data) tecnicoData = byAuth.data;
      }
      if (!tecnicoData) {
        return NextResponse.json({ error: 'Técnico não encontrado.' }, { status: 404 });
      }
      const { data: configEmpresa } = await supabase
        .from('configuracoes_comissao')
        .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao')
        .eq('empresa_id', os.empresa_id)
        .maybeSingle();
      let tipoComissao = (tecnicoData.tipo_comissao as string) || (configEmpresa?.tipo_comissao as string) || 'porcentagem';
      let valorBase = tipoComissao === 'fixo' ? (tecnicoData.comissao_fixa ?? configEmpresa?.comissao_fixa_padrao ?? 0) : (tecnicoData.comissao_percentual ?? configEmpresa?.comissao_padrao ?? 10);
      const valorTotal = Number(os.valor_faturado ?? os.valor_servico ?? 0) || 0;
      const valorServico = Number(os.valor_servico ?? valorTotal) || valorTotal;
      const valorComissaoCalc = tipoComissao === 'fixo' ? valorBase : (valorServico * valorBase) / 100;
      const insertPayload: any = {
        tecnico_id: tecnicoData.id,
        ordem_servico_id: os.id,
        empresa_id: os.empresa_id,
        cliente_id: os.cliente_id,
        valor_servico: valorServico,
        valor_peca: os.valor_peca ?? 0,
        valor_total: valorTotal,
        tipo_comissao: tipoComissao,
        valor_comissao: valorComissaoCalc,
        data_entrega: os.data_entrega || new Date().toISOString(),
        data_calculo: new Date().toISOString(),
        status: 'PAGA',
        tipo_ordem: (os.tipo || 'normal').toLowerCase(),
      };
      if (tipoComissao === 'porcentagem') {
        insertPayload.percentual_comissao = valorBase;
        insertPayload.valor_comissao_fixa = null;
      } else {
        insertPayload.valor_comissao_fixa = valorBase;
        insertPayload.percentual_comissao = null;
      }
      const { data: inserted, error: insertErr } = await supabase
        .from('comissoes_historico')
        .insert(insertPayload)
        .select()
        .single();
      if (insertErr) {
        console.error('Erro ao criar comissão prevista:', insertErr);
        return NextResponse.json({ error: insertErr.message || 'Erro ao registrar comissão.' }, { status: 400 });
      }
      return NextResponse.json({ data: inserted, success: true }, { status: 200 });
    }

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
