import { NextRequest, NextResponse } from 'next/server';
import { getTecnicoByWhatsApp, getComissoesTecnico, formatComissoesMessage } from '@/lib/whatsapp-commands';
import { getChatGPTResponse, isChatGPTAvailable } from '@/lib/chatgpt';
import { getTecnicoDataForContext } from '@/lib/tecnico-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extrair parâmetros da query string
    const hubMode = searchParams.get('hub.mode');
    const hubVerifyToken = searchParams.get('hub.verify_token');
    const hubChallenge = searchParams.get('hub.challenge');
    
    console.log('🔍 Webhook GET - Validação:', {
      hubMode,
      hubVerifyToken,
      hubChallenge,
      expectedToken: process.env.WHATSAPP_VERIFY_TOKEN
    });
    
    // Verificar se todos os parâmetros necessários estão presentes
    if (!hubMode || !hubVerifyToken || !hubChallenge) {
      console.error('❌ Parâmetros obrigatórios ausentes');
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes' },
        { status: 400 }
      );
    }
    
    // Verificar se o token de verificação está correto
    if (hubVerifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ Token de verificação válido - Respondendo com challenge');
      return new NextResponse(hubChallenge, { status: 200 });
    } else {
      console.error('❌ Token de verificação inválido');
      return NextResponse.json(
        { error: 'Token de verificação inválido' },
        { status: 403 }
      );
    }
    
  } catch (error) {
    console.error('❌ Erro na validação GET:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Processa mensagens recebidas do WhatsApp
 * Suporta comandos como /comissoes e usa ChatGPT para outras mensagens
 */
export async function processWhatsAppMessage(from: string, messageBody: string) {
  try {
    console.log('📨 Processando mensagem WhatsApp:', { from, messageBody });

    // Normalizar número (remover + e espaços)
    const normalizedFrom = from.replace(/\D/g, '');
    const trimmedMessage = messageBody.trim();

    // Verificar se é um comando
    if (trimmedMessage.toLowerCase() === '/comissoes' || trimmedMessage.toLowerCase().startsWith('/comissoes')) {
      console.log('💰 Comando /comissoes detectado');

      // Buscar técnico pelo WhatsApp
      const tecnico = await getTecnicoByWhatsApp(normalizedFrom);
      
      if (!tecnico) {
        console.log('❌ Técnico não encontrado para WhatsApp:', normalizedFrom);
        return {
          message: '❌ Você não está cadastrado como técnico no sistema.\n\nEntre em contato com o administrador para cadastrar seu WhatsApp.'
        };
      }

      console.log('✅ Técnico encontrado:', tecnico.nome);

      // Buscar comissões
      const { comissoes, total, totalPago, totalPendente } = await getComissoesTecnico(tecnico.id, 10);

      // Formatar mensagem
      const message = formatComissoesMessage(comissoes, total, totalPago, totalPendente, tecnico.nome);

      return { message };
    }

    // Se não for comando, tentar usar ChatGPT
    const chatGPTDisponivel = isChatGPTAvailable();
    console.log('🔍 Verificando ChatGPT:', {
      disponivel: chatGPTDisponivel,
      temApiKey: !!process.env.OPENAI_API_KEY,
      mensagem: trimmedMessage
    });
    
    if (chatGPTDisponivel) {
      console.log('🤖 ChatGPT disponível - processando mensagem com IA');
      console.log('📝 Mensagem para ChatGPT:', trimmedMessage);
      
      // Buscar informações do técnico para contexto
      const tecnico = await getTecnicoByWhatsApp(normalizedFrom);
      console.log('👤 Contexto do técnico:', {
        encontrado: !!tecnico,
        nome: tecnico?.nome,
        isTecnico: !!tecnico
      });
      
      // Se for técnico, buscar dados reais para contexto dinâmico
      let tecnicoData = null;
      if (tecnico) {
        try {
          console.log('📊 Buscando dados do técnico para contexto dinâmico...');
          tecnicoData = await getTecnicoDataForContext(tecnico.id);
          console.log('✅ Dados do técnico obtidos:', {
            temComissoes: !!tecnicoData?.comissoes,
            temOSPendentes: !!tecnicoData?.osPendentes,
            totalOSPendentes: tecnicoData?.totalOSPendentes
          });
        } catch (error: any) {
          console.error('⚠️ Erro ao buscar dados do técnico (continuando sem dados):', error.message);
          // Continuar mesmo sem dados do técnico
        }
      }
      
      try {
        console.log('🚀 Chamando ChatGPT API...');
        const chatGPTResponse = await getChatGPTResponse(trimmedMessage, {
          userName: tecnico?.nome,
          isTecnico: !!tecnico,
          tecnicoData: tecnicoData || undefined,
        });

        if (chatGPTResponse && chatGPTResponse.trim().length > 0) {
          console.log('✅ ChatGPT retornou resposta:', {
            length: chatGPTResponse.length,
            preview: chatGPTResponse.substring(0, 100)
          });
          return { message: chatGPTResponse };
        } else {
          console.warn('⚠️ ChatGPT retornou resposta vazia ou null');
        }
      } catch (error: any) {
        console.error('❌ Erro ao chamar ChatGPT:', error);
        console.error('❌ Detalhes do erro:', {
          message: error.message,
          code: error.code,
          status: error.status,
          stack: error.stack?.substring(0, 200)
        });
        // Continuar para fallback
      }
    } else {
      console.warn('⚠️ ChatGPT não disponível:', {
        temApiKey: !!process.env.OPENAI_API_KEY,
        apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
      });
    }

    // Fallback: Comando não reconhecido e ChatGPT não disponível
    return {
      message: '❓ Comando não reconhecido.\n\nComandos disponíveis:\n• /comissoes - Ver suas comissões\n\n💡 Dica: Você pode fazer perguntas gerais e eu tentarei ajudar!'
    };

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    return {
      message: '❌ Erro ao processar sua solicitação. Tente novamente mais tarde.'
    };
  }
}

/**
 * Envia mensagem de texto via WhatsApp API
 */
async function sendWhatsAppTextMessage(to: string, message: string): Promise<boolean> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.error('❌ Variáveis de ambiente do WhatsApp não configuradas');
      return false;
    }

    // Normalizar número
    const normalizedTo = to.replace(/\D/g, '');
    const phoneWithCountryCode = normalizedTo.startsWith('55') 
      ? normalizedTo 
      : `55${normalizedTo}`;

    const whatsappMessage = {
      messaging_product: 'whatsapp',
      to: phoneWithCountryCode,
      type: 'text',
      text: {
        body: message
      }
    };

    console.log('📱 Enviando resposta WhatsApp:', { to: phoneWithCountryCode, messageLength: message.length });

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(whatsappMessage),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', responseData);
      return false;
    }

    console.log('✅ Mensagem WhatsApp enviada com sucesso');
    return true;

  } catch (error) {
    console.error('❌ Erro interno ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Receber o body da requisição
    const body = await request.json();
    
    console.log('📨 Webhook POST - Mensagem recebida:', JSON.stringify(body, null, 2));
    
    // Processar webhook do WhatsApp
    // Estrutura: body.entry[0].changes[0].value.messages[0]
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    console.log('🔍 Debug estrutura webhook:', {
      hasEntry: !!entry,
      hasChanges: !!changes,
      hasValue: !!value,
      hasMessages: !!messages,
      messagesLength: messages?.length || 0,
      valueKeys: value ? Object.keys(value) : [],
      changesType: changes?.field
    });

    if (messages && messages.length > 0) {
      const message = messages[0];
      const from = message.from;
      const messageType = message.type;
      const messageId = message.id;

      console.log('📨 Mensagem detectada:', { 
        from, 
        type: messageType, 
        messageId,
        timestamp: message.timestamp 
      });

      // Processar apenas mensagens de texto
      if (messageType === 'text' && message.text?.body) {
        const messageBody = message.text.body;
        console.log('💬 Texto recebido:', messageBody);

        // Processar mensagem (comando ou ChatGPT)
        const result = await processWhatsAppMessage(from, messageBody);

        // Enviar resposta
        if (result.message) {
          console.log('📤 Preparando para enviar resposta:', {
            to: from,
            messageLength: result.message.length,
            messagePreview: result.message.substring(0, 100)
          });

          const sent = await sendWhatsAppTextMessage(from, result.message);
          
          if (sent) {
            console.log('✅ Resposta enviada com sucesso para:', from);
          } else {
            console.error('❌ Falha ao enviar resposta para:', from);
          }
        } else {
          console.warn('⚠️ Processamento não retornou mensagem para enviar');
        }
      } else {
        console.log('⚠️ Tipo de mensagem não suportado:', messageType, {
          message: message
        });
      }
    } else {
      console.log('ℹ️ Webhook recebido mas sem mensagens (pode ser status update, etc)');
      console.log('📋 Estrutura completa do webhook:', {
        entry: entry ? Object.keys(entry) : null,
        changes: changes ? Object.keys(changes) : null,
        value: value ? Object.keys(value) : null,
        statuses: value?.statuses,
        contacts: value?.contacts
      });
    }
    
    // Sempre retornar 200 OK para o WhatsApp
    return NextResponse.json(
      { status: 'success', message: 'Webhook processado' },
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error('❌ Erro no recebimento POST:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Retornar 200 mesmo em erro para não causar retry do WhatsApp
    return NextResponse.json(
      { error: 'Erro interno do servidor', message: error.message },
      { status: 200 }
    );
  }
}
