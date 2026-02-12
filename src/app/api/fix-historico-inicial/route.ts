import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    console.log('🔧 CORREÇÃO HISTÓRICO INICIAL: Iniciando...');
    
    // 1. Buscar todas as OSs que não têm histórico inicial
    console.log('📋 Buscando OSs sem histórico inicial...');
    
    const { data: todasOSs, error: osError } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, status, status_tecnico, created_at')
      .order('created_at', { ascending: true });
    
    if (osError) {
      console.error('❌ Erro ao buscar OSs:', osError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar OSs',
        details: osError
      });
    }
    
    console.log(`📊 Encontradas ${todasOSs?.length || 0} OSs no total`);
    
    // 2. Para cada OS, verificar se já tem histórico inicial
    const osSemHistorico = [];
    const osComHistorico = [];
    
    for (const os of todasOSs || []) {
      const { data: historicoExistente } = await supabase
        .from('status_historico')
        .select('id')
        .eq('os_id', os.id)
        .limit(1);
      
      if (!historicoExistente || historicoExistente.length === 0) {
        osSemHistorico.push(os);
      } else {
        osComHistorico.push(os);
      }
    }
    
    console.log(`📈 OSs sem histórico: ${osSemHistorico.length}`);
    console.log(`✅ OSs com histórico: ${osComHistorico.length}`);
    
    // 3. Registrar status inicial para OSs sem histórico
    const resultados = {
      processadas: 0,
      sucessos: 0,
      erros: 0,
      detalhes: [] as any[]
    };
    
    for (const os of osSemHistorico) {
      try {
        console.log(`🔧 Processando OS #${os.numero_os} (${os.id})...`);
        
        // Determinar status inicial baseado na data de criação e status atual
        let statusInicial = 'ORÇAMENTO'; // Status padrão atual
        let statusTecnicoInicial = null;
        let motivo = 'OS criada';
        
        // Se a OS tem status técnico, usar ele como inicial
        if (os.status_tecnico) {
          statusTecnicoInicial = os.status_tecnico;
          motivo = `OS criada com status técnico: ${os.status_tecnico}`;
        }
        
        // Se a OS já tem status definido, usar ele
        if (os.status && os.status !== 'ORÇAMENTO') {
          statusInicial = os.status;
          motivo = `OS criada com status: ${os.status}`;
        }
        
        // Inserir registro inicial no histórico
        const { error: insertError } = await supabase
          .from('status_historico')
          .insert({
            os_id: os.id,
            status_anterior: null,
            status_novo: statusInicial,
            status_tecnico_anterior: null,
            status_tecnico_novo: statusTecnicoInicial,
            usuario_id: null,
            usuario_nome: 'Sistema',
            motivo: motivo,
            observacoes: `Status inicial registrado automaticamente em ${new Date().toLocaleString('pt-BR')}`,
            created_at: os.created_at // Usar a data de criação da OS
          });
        
        if (insertError) {
          console.error(`❌ Erro ao inserir histórico para OS #${os.numero_os}:`, insertError);
          resultados.erros++;
          resultados.detalhes.push({
            os_id: os.id,
            numero_os: os.numero_os,
            status: 'erro',
            erro: insertError.message
          });
        } else {
          console.log(`✅ Histórico inicial registrado para OS #${os.numero_os}`);
          resultados.sucessos++;
          resultados.detalhes.push({
            os_id: os.id,
            numero_os: os.numero_os,
            status: 'sucesso',
            status_inicial: statusInicial,
            status_tecnico_inicial: statusTecnicoInicial,
            motivo: motivo
          });
        }
        
        resultados.processadas++;
        
      } catch (err: any) {
        console.error(`❌ Erro geral ao processar OS #${os.numero_os}:`, err);
        resultados.erros++;
        resultados.detalhes.push({
          os_id: os.id,
          numero_os: os.numero_os,
          status: 'erro',
          erro: err.message
        });
      }
    }
    
    // 4. Verificar resultado final
    console.log('📊 RESULTADO FINAL:');
    console.log(`- OSs processadas: ${resultados.processadas}`);
    console.log(`- Sucessos: ${resultados.sucessos}`);
    console.log(`- Erros: ${resultados.erros}`);
    
    return NextResponse.json({
      success: true,
      resumo: {
        total_os_encontradas: todasOSs?.length || 0,
        os_sem_historico: osSemHistorico.length,
        os_com_historico: osComHistorico.length,
        os_processadas: resultados.processadas,
        sucessos: resultados.sucessos,
        erros: resultados.erros
      },
      detalhes: resultados.detalhes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro geral na correção do histórico inicial:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
