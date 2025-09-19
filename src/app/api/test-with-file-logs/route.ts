import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { formatPhoneNumber } from '@/lib/utils';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const logs: string[] = [];
  
  function addLog(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    logs.push(logMessage);
    console.log(logMessage);
  }

  try {
    const osId = '64bdea43-ebb8-4044-85b5-b45c6da1df4a';
    
    addLog('🧪 TESTE COMPLETO COM ARQUIVO DE LOG: Iniciando teste para OS: ' + osId);

    // 1. Buscar dados da OS
    addLog('🔍 PASSO 1: Buscando dados da OS...');
    const supabase = createAdminClient();
    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        cliente_id,
        tecnico_id,
        status,
        status_tecnico,
        servico,
        clientes!inner(nome, telefone)
      `)
      .eq('id', osId)
      .single();

    if (osError) {
      addLog('❌ ERRO PASSO 1: Erro ao buscar OS: ' + JSON.stringify(osError));
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Erro ao buscar OS', 
        details: osError,
        step: 'buscar_os',
        logFile: '/api/download-logs'
      }, { status: 500 });
    }

    addLog('✅ PASSO 1: OS encontrada - ID: ' + osData.id + ', Número: ' + osData.numero_os + ', Técnico ID: ' + osData.tecnico_id);
    addLog('✅ PASSO 1: Cliente - Nome: ' + (osData.clientes as any)?.nome + ', Telefone: ' + (osData.clientes as any)?.telefone);

    // 2. Buscar dados do técnico
    addLog('🔍 PASSO 2: Buscando dados do técnico...');
    const { data: tecnicoData, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('id, nome, telefone, email')
      .eq('id', osData.tecnico_id)
      .eq('nivel', 'tecnico')
      .single();

    if (tecnicoError) {
      addLog('❌ ERRO PASSO 2: Erro ao buscar técnico: ' + JSON.stringify(tecnicoError));
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Erro ao buscar técnico', 
        details: tecnicoError,
        step: 'buscar_tecnico',
        logFile: '/api/download-logs'
      }, { status: 500 });
    }

    addLog('✅ PASSO 2: Técnico encontrado - ID: ' + tecnicoData.id + ', Nome: ' + tecnicoData.nome + ', Telefone: ' + tecnicoData.telefone + ', Email: ' + tecnicoData.email);

    // 3. Verificar se o técnico tem telefone
    if (!tecnicoData.telefone) {
      addLog('❌ ERRO PASSO 3: Técnico não possui telefone cadastrado');
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Técnico não possui telefone cadastrado',
        step: 'verificar_telefone',
        logFile: '/api/download-logs'
      }, { status: 400 });
    }

    addLog('✅ PASSO 3: Técnico tem telefone: ' + tecnicoData.telefone);

    // 4. Formatar número de telefone
    addLog('🔍 PASSO 4: Formatando número de telefone...');
    const formattedPhoneNumber = formatPhoneNumber(tecnicoData.telefone);
    if (!formattedPhoneNumber) {
      addLog('❌ ERRO PASSO 4: Número de telefone inválido: ' + tecnicoData.telefone);
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Número de telefone inválido',
        telefone: tecnicoData.telefone,
        logFile: '/api/download-logs'
      }, { status: 400 });
    }

    addLog('✅ PASSO 4: Número formatado: ' + formattedPhoneNumber);

    // 5. Verificar variáveis de ambiente
    addLog('🔍 PASSO 5: Verificando variáveis de ambiente...');
    const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    addLog('🔍 PASSO 5: WHATSAPP_ACCESS_TOKEN: ' + (WHATSAPP_ACCESS_TOKEN ? 'CONFIGURADO' : 'NÃO CONFIGURADO'));
    addLog('🔍 PASSO 5: WHATSAPP_PHONE_NUMBER_ID: ' + (WHATSAPP_PHONE_NUMBER_ID ? 'CONFIGURADO' : 'NÃO CONFIGURADO'));

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      addLog('❌ ERRO PASSO 5: Variáveis de ambiente não configuradas');
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Variáveis de ambiente não configuradas',
        step: 'verificar_env_vars',
        logFile: '/api/download-logs'
      }, { status: 500 });
    }

    addLog('✅ PASSO 5: Variáveis de ambiente configuradas');

    // 6. Criar mensagem
    addLog('🔍 PASSO 6: Criando mensagem...');
    const clientName = (osData.clientes as any)?.nome || 'Não informado';
    const serviceDescription = osData.servico || 'Serviço não especificado';
    const message = `🎉 *OS APROVADA!*
📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clientName}
🔧 *Serviço:* ${serviceDescription}
✅ *Status:* Aprovado
A OS foi aprovada pelo cliente e está pronta para execução!
_Consert - Sistema de Gestão_`;

    addLog('✅ PASSO 6: Mensagem criada: ' + message.substring(0, 100) + '...');

    // 7. Enviar mensagem via WhatsApp Cloud API
    addLog('🔍 PASSO 7: Enviando mensagem via WhatsApp Cloud API...');
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhoneNumber,
      type: 'text',
      text: { body: message },
    };

    const headers = {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };

    addLog('🔍 PASSO 7: URL: ' + url);
    addLog('🔍 PASSO 7: Payload: ' + JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(url, payload, { headers });
      addLog('✅ PASSO 7: WhatsApp API response: ' + JSON.stringify(response.data));
      
      addLog('🎉 TESTE COMPLETO: SUCESSO! Mensagem enviada com sucesso!');
      
      await saveLogsToFile(logs);
      
      return NextResponse.json({
        success: true,
        message: 'Teste completo executado com sucesso!',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          cliente_nome: clientName
        },
        tecnicoData: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          telefone: tecnicoData.telefone
        },
        whatsappResponse: response.data,
        logFile: '/api/download-logs'
      });

    } catch (whatsappError: any) {
      addLog('❌ ERRO PASSO 7: Erro ao enviar mensagem WhatsApp: ' + JSON.stringify(whatsappError.response?.data || whatsappError.message));
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Erro ao enviar mensagem WhatsApp', 
        details: whatsappError.response?.data || whatsappError.message,
        step: 'enviar_whatsapp',
        logFile: '/api/download-logs'
      }, { status: 500 });
    }

  } catch (error: any) {
    addLog('❌ ERRO GERAL: Erro interno: ' + error.message);
    await saveLogsToFile(logs);
    return NextResponse.json({ 
      error: 'Erro interno no teste completo', 
      details: error.message,
      step: 'erro_interno',
      logFile: '/api/download-logs'
    }, { status: 500 });
  }
}

async function saveLogsToFile(logs: string[]) {
  try {
    const logContent = logs.join('\n');
    const fileName = `debug-logs-${Date.now()}.txt`;
    const filePath = path.join(process.cwd(), 'public', fileName);
    
    // Criar diretório se não existir
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, logContent, 'utf8');
    console.log('📁 Logs salvos em:', fileName);
  } catch (error) {
    console.error('❌ Erro ao salvar logs:', error);
  }
}
