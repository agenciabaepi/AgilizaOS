import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { formatPhoneNumber } from '@/lib/utils';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const logs: string[] = [];
  
  function addLog(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    logs.push(logMessage);
    console.log(logMessage);
  }

  try {
    addLog('🔍 DEBUG OS REAL: Buscando OSs com status APROVADO...');

    // Buscar OSs com status APROVADO (que deveriam ter enviado notificação)
    const supabase = createAdminClient();
    
    const { data: ordensRecentes, error: ordensError } = await supabase
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
      .eq('status', 'APROVADO')
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordensError) {
      addLog('❌ ERRO: Erro ao buscar OSs recentes: ' + JSON.stringify(ordensError));
      return NextResponse.json({ 
        error: 'Erro ao buscar OSs recentes', 
        details: ordensError,
        logs: logs
      }, { status: 500 });
    }

    addLog('✅ OSs encontradas: ' + ordensRecentes.length);
    
    for (const os of ordensRecentes) {
      addLog(`📋 OS #${os.numero_os} - Status: ${os.status} - Técnico ID: ${os.tecnico_id}`);
      addLog(`👤 Cliente: ${(os.clientes as any)?.nome} - Telefone: ${(os.clientes as any)?.telefone}`);
      
      // Buscar dados do técnico
      if (os.tecnico_id) {
        const { data: tecnicoData, error: tecnicoError } = await supabase
          .from('usuarios')
          .select('id, nome, whatsapp, email, nivel')
          .eq('id', os.tecnico_id)
          .single();

        if (tecnicoError) {
          addLog(`❌ ERRO TÉCNICO OS #${os.numero_os}: ${JSON.stringify(tecnicoError)}`);
        } else {
          addLog(`👨‍🔧 Técnico OS #${os.numero_os}: ${tecnicoData.nome} - WhatsApp: ${tecnicoData.whatsapp} - Nível: ${tecnicoData.nivel}`);
          
          // Testar formatação do número
          if (tecnicoData.whatsapp) {
            const formattedNumber = formatPhoneNumber(tecnicoData.whatsapp);
            addLog(`📱 Número formatado OS #${os.numero_os}: ${formattedNumber}`);
            
            // Testar envio real se for status APROVADO
            if (os.status === 'APROVADO') {
              addLog(`🚀 TESTANDO ENVIO REAL PARA OS #${os.numero_os}...`);
              
              const message = `🎉 *OS APROVADA!*
📋 *OS #${os.numero_os}*
👤 *Cliente:* ${(os.clientes as any)?.nome}
🔧 *Serviço:* ${os.servico || 'Serviço não especificado'}
✅ *Status:* Aprovado
A OS foi aprovada pelo cliente e está pronta para execução!
_Consert - Sistema de Gestão_`;

              const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
              const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
              
              addLog(`🔑 VARIÁVEIS: TOKEN=${!!WHATSAPP_ACCESS_TOKEN}, PHONE_ID=${!!WHATSAPP_PHONE_NUMBER_ID}, NUMBER=${!!formattedNumber}`);
              
              if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID && formattedNumber) {
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

                  const response = await axios.post(url, payload, { headers });
                  addLog(`✅ ENVIO REAL OS #${os.numero_os}: SUCESSO! ${JSON.stringify(response.data)}`);
                } catch (whatsappError: any) {
                  addLog(`❌ ERRO ENVIO REAL OS #${os.numero_os}: ${JSON.stringify(whatsappError.response?.data || whatsappError.message)}`);
                }
              } else {
                addLog(`❌ VARIÁVEIS FALTANDO OS #${os.numero_os}: TOKEN=${!!WHATSAPP_ACCESS_TOKEN}, PHONE_ID=${!!WHATSAPP_PHONE_NUMBER_ID}, NUMBER=${!!formattedNumber}`);
              }
            }
          } else {
            addLog(`❌ TÉCNICO SEM WHATSAPP OS #${os.numero_os}: ${tecnicoData.nome}`);
          }
        }
      } else {
        addLog(`❌ OS #${os.numero_os} SEM TÉCNICO ASSIGNADO`);
      }
      
      addLog('---');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug de OSs reais executado!',
      ordensRecentes: ordensRecentes.map(os => ({
        id: os.id,
        numero_os: os.numero_os,
        status: os.status,
        tecnico_id: os.tecnico_id,
        cliente_nome: (os.clientes as any)?.nome,
        cliente_telefone: (os.clientes as any)?.telefone,
        created_at: os.created_at
      })),
      logs: logs
    });

  } catch (error: any) {
    addLog('❌ ERRO GERAL: ' + error.message);
    return NextResponse.json({ 
      error: 'Erro interno no debug', 
      details: error.message,
      logs: logs
    }, { status: 500 });
  }
}
