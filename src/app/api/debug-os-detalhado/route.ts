import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { formatPhoneNumber } from '@/lib/utils';

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
    addLog('🔍 DEBUG DETALHADO: Iniciando análise completa...');

    const supabase = createAdminClient();

    // 1. Buscar dados da OS
    addLog('📋 PASSO 1: Buscando dados da OS...');
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
        created_at,
        clientes!inner(nome, telefone)
      `)
      .eq('id', osId)
      .single();

    if (osError) {
      addLog(`❌ ERRO OS: ${JSON.stringify(osError)}`);
      return NextResponse.json({ 
        error: 'OS não encontrada', 
        details: osError,
        logs: logs
      }, { status: 500 });
    }

    addLog(`✅ OS encontrada: #${osData.numero_os} - Status: ${osData.status} - Técnico ID: ${osData.tecnico_id}`);
    addLog(`👤 Cliente: ${(osData.clientes as any)?.nome} - Telefone: ${(osData.clientes as any)?.telefone}`);

    // 2. Buscar dados do técnico específico
    addLog('👨‍🔧 PASSO 2: Buscando técnico específico...');
    let { data: tecnicoData, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, email, nivel')
      .eq('id', osData.tecnico_id)
      .eq('nivel', 'tecnico')
      .single();

    if (tecnicoError && tecnicoError.code === 'PGRST116') {
      addLog(`⚠️ Técnico específico não encontrado, buscando fallback...`);
      
      // 3. Buscar qualquer técnico como fallback
      const { data: fallbackTecnico, error: fallbackError } = await supabase
        .from('usuarios')
        .select('id, nome, whatsapp, email, nivel')
        .eq('nivel', 'tecnico')
        .limit(1)
        .single();
      
      if (!fallbackError && fallbackTecnico) {
        tecnicoData = fallbackTecnico;
        tecnicoError = null;
        addLog(`✅ Usando técnico fallback: ${fallbackTecnico.nome}`);
      } else {
        addLog(`❌ ERRO FALLBACK: ${JSON.stringify(fallbackError)}`);
      }
    } else if (tecnicoError) {
      addLog(`❌ ERRO TÉCNICO: ${JSON.stringify(tecnicoError)}`);
    } else {
      addLog(`✅ Técnico específico encontrado: ${tecnicoData.nome}`);
    }

    if (!tecnicoData) {
      addLog('❌ NENHUM TÉCNICO ENCONTRADO');
      return NextResponse.json({
        success: false,
        message: 'Nenhum técnico encontrado',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          status: osData.status,
          tecnico_id: osData.tecnico_id,
          cliente_nome: (osData.clientes as any)?.nome
        },
        logs: logs
      });
    }

    addLog(`👨‍🔧 Técnico final: ${tecnicoData.nome} - WhatsApp: ${tecnicoData.whatsapp} - Nível: ${tecnicoData.nivel}`);

    // 4. Verificar whatsapp
    if (!tecnicoData.whatsapp) {
      addLog('❌ TÉCNICO SEM WHATSAPP CADASTRADO');
      return NextResponse.json({
        success: false,
        message: 'Técnico sem whatsapp cadastrado',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          status: osData.status,
          tecnico_id: osData.tecnico_id,
          cliente_nome: (osData.clientes as any)?.nome
        },
        tecnicoData: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          whatsapp: tecnicoData.whatsapp,
          nivel: tecnicoData.nivel
        },
        logs: logs
      });
    }

    // 5. Testar formatação do número
    addLog('📱 PASSO 3: Testando formatação do número...');
    const formattedNumber = formatPhoneNumber(tecnicoData.whatsapp);
    addLog(`📱 Número original: ${tecnicoData.whatsapp}`);
    addLog(`📱 Número formatado: ${formattedNumber}`);

    if (!formattedNumber) {
      addLog('❌ NÚMERO INVÁLIDO - Não foi possível formatar');
      return NextResponse.json({
        success: false,
        message: 'Número de whatsapp inválido',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          status: osData.status,
          tecnico_id: osData.tecnico_id,
          cliente_nome: (osData.clientes as any)?.nome
        },
        tecnicoData: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          whatsapp: tecnicoData.whatsapp,
          nivel: tecnicoData.nivel
        },
        formattedNumber: formattedNumber,
        logs: logs
      });
    }

    // 6. Verificar variáveis de ambiente
    addLog('🔑 PASSO 4: Verificando variáveis de ambiente...');
    const WHATSAPP_ACCESS_TOKEN = 'EAATEn3qAZAgsBPZA6044TOzGpj2fbuepMYMkQVoZAgDTmixjpqy5YSZCYijxZAMZAEBjap3axvOzloz9yE72Enod7xAld6ZChbToZC6KWxla1rEVcZBgdpKEi1VOrZB58yzY2BpETevNFaOEF2n6pFc8H72bOWm1jhJjMtarJMD4XiVuoKmfKnCuB1kp1JZBZB0n3XvZAagZDZD';
    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    addLog(`🔑 TOKEN: ${WHATSAPP_ACCESS_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
    addLog(`🔑 PHONE_ID: ${WHATSAPP_PHONE_NUMBER_ID ? '✅ Configurado' : '❌ Não configurado'}`);

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      addLog('❌ VARIÁVEIS DE AMBIENTE FALTANDO');
      return NextResponse.json({
        success: false,
        message: 'Variáveis de ambiente faltando',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          status: osData.status,
          tecnico_id: osData.tecnico_id,
          cliente_nome: (osData.clientes as any)?.nome
        },
        tecnicoData: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          whatsapp: tecnicoData.whatsapp,
          nivel: tecnicoData.nivel
        },
        formattedNumber: formattedNumber,
        envVars: {
          token: !!WHATSAPP_ACCESS_TOKEN,
          phoneId: !!WHATSAPP_PHONE_NUMBER_ID
        },
        logs: logs
      });
    }

    // 7. Testar envio real
    addLog('🚀 PASSO 5: Testando envio real de mensagem...');
    
    const message = `🎉 *OS APROVADA!*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${(osData.clientes as any)?.nome}
🔧 *Serviço:* ${osData.servico || 'Serviço não especificado'}
✅ *Status:* Aprovado

A OS foi aprovada pelo cliente e está pronta para execução!

_Consert - Sistema de Gestão_`;

    try {
      const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: { body: message },
      };

      const headers = {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      };

      addLog(`📤 Enviando para: ${url}`);
      addLog(`📤 Para: ${formattedNumber}`);
      addLog(`📤 Mensagem: ${message.substring(0, 100)}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      
      if (response.ok) {
        addLog(`✅ ENVIO REAL: SUCESSO! ${JSON.stringify(responseData)}`);
      } else {
        addLog(`❌ ERRO ENVIO REAL: ${JSON.stringify(responseData)}`);
      }

      return NextResponse.json({
        success: response.ok,
        message: response.ok ? 'Mensagem enviada com sucesso!' : 'Erro ao enviar mensagem',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          status: osData.status,
          tecnico_id: osData.tecnico_id,
          cliente_nome: (osData.clientes as any)?.nome
        },
        tecnicoData: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          whatsapp: tecnicoData.whatsapp,
          nivel: tecnicoData.nivel
        },
        formattedNumber: formattedNumber,
        whatsappResponse: responseData,
        logs: logs
      });

    } catch (whatsappError: any) {
      addLog(`❌ ERRO ENVIO REAL: ${whatsappError.message}`);
      return NextResponse.json({
        success: false,
        message: 'Erro ao enviar mensagem WhatsApp',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          status: osData.status,
          tecnico_id: osData.tecnico_id,
          cliente_nome: (osData.clientes as any)?.nome
        },
        tecnicoData: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          whatsapp: tecnicoData.whatsapp,
          nivel: tecnicoData.nivel
        },
        formattedNumber: formattedNumber,
        error: whatsappError.message,
        logs: logs
      });
    }

  } catch (error: any) {
    addLog('❌ ERRO GERAL: ' + error.message);
    return NextResponse.json({ 
      error: 'Erro interno no debug', 
      details: error.message,
      logs: logs
    }, { status: 500 });
  }
}
