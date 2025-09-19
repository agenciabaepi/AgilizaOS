import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { osId } = await request.json();

    if (!osId) {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🔍 DEBUG BANCADA INICIAR: Testando OS ID:', osId);

    const supabase = createAdminClient();

    // 1. Verificar se a OS existe
    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('id', osId)
      .single();

    if (osError) {
      console.error('❌ OS não encontrada:', osError);
      return NextResponse.json({
        success: false,
        error: 'OS não encontrada',
        details: osError
      });
    }

    console.log('✅ OS encontrada:', {
      id: osData.id,
      numero_os: osData.numero_os,
      status: osData.status,
      status_tecnico: osData.status_tecnico,
      tecnico_id: osData.tecnico_id
    });

    // 2. Tentar atualizar o status
    const { data: updateData, error: updateError } = await supabase
      .from('ordens_servico')
      .update({
        status: 'EM_ANALISE',
        status_tecnico: 'EM ANÁLISE'
      })
      .eq('id', osId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar OS:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar OS',
        details: updateError
      });
    }

    console.log('✅ OS atualizada com sucesso:', updateData);

    // 3. Registrar no histórico
    const { error: historicoError } = await supabase
      .from('status_historico')
      .insert({
        os_id: osId,
        status_anterior: osData.status,
        status_novo: 'EM_ANALISE',
        status_tecnico_anterior: osData.status_tecnico,
        status_tecnico_novo: 'EM ANÁLISE',
        usuario_id: null,
        usuario_nome: 'Sistema',
        motivo: 'Início da OS pelo técnico',
        observacoes: 'OS iniciada na bancada do técnico'
      });

    if (historicoError) {
      console.warn('⚠️ Erro ao registrar histórico:', historicoError);
    } else {
      console.log('✅ Histórico registrado com sucesso');
    }

    return NextResponse.json({
      success: true,
      message: 'OS iniciada com sucesso',
      data: {
        os_anterior: osData,
        os_atualizada: updateData,
        historico_registrado: !historicoError
      }
    });

  } catch (error) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error },
      { status: 500 }
    );
  }
}
