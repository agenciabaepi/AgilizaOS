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
    
    addLog('🧪 TESTE LOCALHOST: Iniciando teste para OS: ' + osId);

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
        logFile: 'debug-logs.txt'
      }, { status: 500 });
    }

    addLog('✅ PASSO 1: OS encontrada - ID: ' + osData.id + ', Número: ' + osData.numero_os + ', Técnico ID: ' + osData.tecnico_id);
    addLog('✅ PASSO 1: Cliente - Nome: ' + (osData.clientes as any)?.nome + ', Telefone: ' + (osData.clientes as any)?.telefone);

    // 2. Buscar dados do técnico
    addLog('🔍 PASSO 2: Buscando dados do técnico...');
    
    // Primeiro, vamos listar todos os usuários para debug
    const { data: allUsers, error: allUsersError } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, email, nivel')
      .limit(10);
    
    if (allUsersError) {
      addLog('❌ ERRO PASSO 2A: Erro ao listar usuários: ' + JSON.stringify(allUsersError));
    } else {
      addLog('✅ PASSO 2A: Usuários encontrados: ' + JSON.stringify(allUsers, null, 2));
    }
    
    // Agora buscar o técnico específico
    let tecnicoData: any = null;
    const { data: specificTecnico, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, email, nivel')
      .eq('id', osData.tecnico_id)
      .single();

    if (tecnicoError) {
      addLog('❌ ERRO PASSO 2B: Erro ao buscar técnico específico: ' + JSON.stringify(tecnicoError));
      addLog('🔍 PASSO 2B: Tentando buscar qualquer técnico disponível...');
      
      // Tentar buscar qualquer técnico disponível
      const { data: anyTecnico, error: anyTecnicoError } = await supabase
        .from('usuarios')
        .select('id, nome, whatsapp, email, nivel')
        .eq('nivel', 'tecnico')
        .limit(1)
        .single();
      
      if (anyTecnicoError) {
        addLog('❌ ERRO PASSO 2C: Nenhum técnico encontrado: ' + JSON.stringify(anyTecnicoError));
        await saveLogsToFile(logs);
        return NextResponse.json({ 
          error: 'Nenhum técnico encontrado', 
          details: tecnicoError,
          step: 'buscar_tecnico',
          logFile: 'debug-logs.txt'
        }, { status: 500 });
      } else {
        addLog('✅ PASSO 2C: Usando técnico alternativo: ' + JSON.stringify(anyTecnico));
        tecnicoData = anyTecnico;
      }
    } else {
      tecnicoData = specificTecnico;
    }

    addLog('✅ PASSO 2: Usuário encontrado - ID: ' + tecnicoData.id + ', Nome: ' + tecnicoData.nome + ', WhatsApp: ' + tecnicoData.whatsapp + ', Email: ' + tecnicoData.email + ', Nível: ' + tecnicoData.nivel);

    // 3. Verificar se o técnico tem whatsapp
    if (!tecnicoData.whatsapp) {
      addLog('❌ ERRO PASSO 3: Técnico não possui WhatsApp cadastrado');
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Técnico não possui WhatsApp cadastrado',
        step: 'verificar_whatsapp',
        logFile: 'debug-logs.txt'
      }, { status: 400 });
    }

    addLog('✅ PASSO 3: Técnico tem WhatsApp: ' + tecnicoData.whatsapp);

    // 4. Formatar número de telefone
    addLog('🔍 PASSO 4: Formatando número de telefone...');
    const formattedPhoneNumber = formatPhoneNumber(tecnicoData.whatsapp);
    if (!formattedPhoneNumber) {
      addLog('❌ ERRO PASSO 4: Número de WhatsApp inválido: ' + tecnicoData.whatsapp);
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Número de WhatsApp inválido',
        whatsapp: tecnicoData.whatsapp,
        logFile: 'debug-logs.txt'
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
        logFile: 'debug-logs.txt'
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
      
      addLog('🎉 TESTE LOCALHOST: SUCESSO! Mensagem enviada com sucesso!');
      
      await saveLogsToFile(logs);
      
      return NextResponse.json({
        success: true,
        message: 'Teste localhost executado com sucesso!',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          cliente_nome: clientName
        },
        tecnicoData: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          whatsapp: tecnicoData.whatsapp
        },
        whatsappResponse: response.data,
        logFile: 'debug-logs.txt'
      });

    } catch (whatsappError: any) {
      addLog('❌ ERRO PASSO 7: Erro ao enviar mensagem WhatsApp: ' + JSON.stringify(whatsappError.response?.data || whatsappError.message));
      await saveLogsToFile(logs);
      return NextResponse.json({ 
        error: 'Erro ao enviar mensagem WhatsApp', 
        details: whatsappError.response?.data || whatsappError.message,
        step: 'enviar_whatsapp',
        logFile: 'debug-logs.txt'
      }, { status: 500 });
    }

  } catch (error: any) {
    addLog('❌ ERRO GERAL: Erro interno: ' + error.message);
    await saveLogsToFile(logs);
    return NextResponse.json({ 
      error: 'Erro interno no teste localhost', 
      details: error.message,
      step: 'erro_interno',
      logFile: 'debug-logs.txt'
    }, { status: 500 });
  }
}

async function saveLogsToFile(logs: string[]) {
  try {
    const logContent = logs.join('\n');
    const filePath = path.join(process.cwd(), 'debug-logs.txt');
    
    fs.writeFileSync(filePath, logContent, 'utf8');
    console.log('📁 Logs salvos em: debug-logs.txt');
  } catch (error) {
    console.error('❌ Erro ao salvar logs:', error);
  }
}
