import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const osId = searchParams.get('os_id');
    
    console.log('🔍 DEBUG STATUS HISTÓRICO: Iniciando verificação...');
    if (osId) {
      console.log(`🎯 Investigando OS específica: ${osId}`);
    }
    
    // 1. Verificar se a tabela status_historico existe
    console.log('📋 Verificando estrutura da tabela status_historico...');
    
    try {
      const { data: tabelaExiste, error: tabelaError } = await supabase
        .from('status_historico')
        .select('*')
        .limit(1);
        
      if (tabelaError) {
        return NextResponse.json({
          success: false,
          error: 'Tabela status_historico não existe ou tem problemas',
          details: tabelaError
        });
      }
      
      console.log('✅ Tabela status_historico existe');
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar tabela status_historico',
        details: err.message
      });
    }
    
    // 2. Verificar dados existentes
    console.log('📊 Verificando dados existentes...');
    
    const { data: historicoData, error: historicoError } = await supabase
      .from('status_historico')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (historicoError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar histórico',
        details: historicoError
      });
    }
    
    // 3. Verificar OSs recentes
    console.log('🔍 Verificando OSs recentes...');
    
    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, status, status_tecnico, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (osError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar OSs',
        details: osError
      });
    }
    
    // 4. Verificar se há histórico para as OSs
    const osComHistorico = [];
    if (osData) {
      for (const os of osData) {
        const { data: historicoOS } = await supabase
          .from('status_historico')
          .select('*')
          .eq('os_id', os.id);
          
        osComHistorico.push({
          os_id: os.id,
          numero_os: os.numero_os,
          status_atual: os.status,
          status_tecnico_atual: os.status_tecnico,
          created_at: os.created_at,
          tem_historico: historicoOS ? historicoOS.length > 0 : false,
          total_registros: historicoOS ? historicoOS.length : 0,
          historico_detalhado: historicoOS || []
        });
      }
    }
    
    // 5. Se foi especificada uma OS, investigar mais profundamente
    let investigacaoEspecifica = null;
    if (osId) {
      console.log(`🔍 Investigação específica da OS ${osId}...`);
      
      // Buscar dados da OS
      const { data: osEspecifica, error: osError } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('id', osId)
        .single();
        
      // Buscar histórico específico
      const { data: historicoEspecifico, error: historicoError } = await supabase
        .from('status_historico')
        .select('*')
        .eq('os_id', osId)
        .order('created_at', { ascending: false });
        
      // Tentar inserir um registro de teste
      const { data: testeInsert, error: testeError } = await supabase
        .from('status_historico')
        .insert({
          os_id: osId,
          status_anterior: 'TESTE_ANTERIOR',
          status_novo: 'TESTE_NOVO',
          motivo: 'Teste de inserção',
          usuario_nome: 'Sistema Teste'
        })
        .select();
        
      investigacaoEspecifica = {
        os_encontrada: !!osEspecifica,
        os_dados: osEspecifica,
        os_error: osError?.message,
        historico_encontrado: historicoEspecifico?.length || 0,
        historico_dados: historicoEspecifico,
        historico_error: historicoError?.message,
        teste_insert_sucesso: !!testeInsert,
        teste_insert_dados: testeInsert,
        teste_insert_error: testeError?.message
      };
      
      // Limpar dados de teste se inseridos
      if (testeInsert) {
        await supabase
          .from('status_historico')
          .delete()
          .eq('motivo', 'Teste de inserção');
      }
    }
    
    // 5. Verificar estrutura da tabela (colunas)
    console.log('🏗️ Verificando estrutura da tabela...');
    
    let estruturaData = null;
    let estruturaError = null;
    
    try {
      const resultado = await supabase
        .from('status_historico')
        .select('*')
        .limit(0);
      estruturaData = resultado.data;
      estruturaError = resultado.error;
    } catch (err: any) {
      estruturaError = err;
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        tabela_existe: true,
        historico_existente: {
          total_registros: historicoData?.length || 0,
          ultimos_registros: historicoData || []
        },
        os_recentes: osComHistorico,
        investigacao_especifica: investigacaoEspecifica,
        resumo: {
          total_os_verificadas: osComHistorico.length,
          os_com_historico: osComHistorico.filter(os => os.tem_historico).length,
          os_sem_historico: osComHistorico.filter(os => !os.tem_historico).length,
          os_investigada: !!investigacaoEspecifica
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro no debug de status histórico:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
