import { NextRequest, NextResponse } from 'next/server';
import { getTecnicoByWhatsApp, getComissoesTecnico, formatComissoesMessage, getSenhaOSPorNumero, formatSenhaOSMessage } from '@/lib/whatsapp-commands';
import { getChatGPTResponse, isChatGPTAvailable } from '@/lib/chatgpt';
import { getUsuarioByWhatsApp, getUserDataByLevel } from '@/lib/user-data';
import { WHATSAPP_WEBHOOK_ENABLED } from '@/config/whatsapp-config';

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
async function processWhatsAppMessage(from: string, messageBody: string) {
  try {
    console.log('📨 Processando mensagem WhatsApp:', { from, messageBody });

    // Normalizar número (remover + e espaços)
    const normalizedFrom = from.replace(/\D/g, '');
    const trimmedMessage = messageBody.trim();

    console.log('🔢 Número normalizado:', {
      original: from,
      normalizado: normalizedFrom,
      length: normalizedFrom.length
    });

    // 🔒 VERIFICAÇÃO DE SEGURANÇA: Apenas usuários cadastrados podem usar o bot
    const usuario = await getUsuarioByWhatsApp(normalizedFrom);
    
    if (!usuario) {
      console.log('🚫 Acesso negado - número não cadastrado:', normalizedFrom);
      return {
        message: '🚫 *Acesso Restrito*\n\nEste serviço é exclusivo para usuários cadastrados no sistema.\n\nEntre em contato com o administrador para cadastrar seu WhatsApp.'
      };
    }

    console.log('✅ Usuário autorizado:', {
      nome: usuario.nome,
      nivel: usuario.nivel
    });

    // Verificar se é um comando /comissoes (apenas para técnicos)
    if (trimmedMessage.toLowerCase() === '/comissoes' || trimmedMessage.toLowerCase().startsWith('/comissoes')) {
      console.log('💰 Comando /comissoes detectado');

      if (usuario.nivel !== 'tecnico') {
        return {
          message: '❌ Este comando é exclusivo para técnicos.\n\nVocê pode fazer perguntas gerais para o assistente virtual!'
        };
      }

      // Buscar técnico específico (compatibilidade com função antiga)
      const tecnico = await getTecnicoByWhatsApp(normalizedFrom);
      if (!tecnico) {
        return {
          message: '❌ Erro ao buscar suas informações de técnico.'
        };
      }

      // Buscar comissões
      const { comissoes, total, totalPago, totalPendente } = await getComissoesTecnico(tecnico.id, 10);

      // Formatar mensagem
      const message = formatComissoesMessage(comissoes, total, totalPago, totalPendente, tecnico.nome);

      return { message };
    }

    // Verificar se é uma pergunta sobre senha da OS
    // Padrões: "qual a senha da os 890", "senha os 890", "qual senha os 890", "senha da os 890", etc.
    const mencionaSenha = /senha|password/i.test(trimmedMessage);
    const mencionaOS = /(?:os|ordem)/i.test(trimmedMessage);
    
    if (mencionaSenha && mencionaOS) {
      // 🔒 SEGURANÇA CRÍTICA: Apenas técnicos podem buscar senhas de OS
      if (usuario.nivel !== 'tecnico') {
        console.log('🚫 Acesso negado - não é técnico:', {
          usuario: usuario.nome,
          nivel: usuario.nivel,
          mensagem: trimmedMessage
        });
        return {
          message: '❌ *Acesso Restrito*\n\nEste comando é exclusivo para técnicos.\n\nApenas técnicos podem consultar senhas de aparelhos das OS atribuídas a eles.'
        };
      }

      // Tentar extrair número da OS da mensagem
      const numeros = trimmedMessage.match(/\d+/g);
      let numeroOS: string | null = null;
      
      if (numeros && numeros.length > 0) {
        // Pegar o número que pareça ser um número de OS (geralmente 2-5 dígitos)
        // Priorizar números menores (mais prováveis de ser número de OS)
        const numerosOS = numeros.filter(n => n.length >= 2 && n.length <= 5);
        numeroOS = numerosOS.length > 0 ? numerosOS[0] : numeros[0];
      }
      
      if (numeroOS) {
        console.log('🔐 Pergunta sobre senha da OS detectada (técnico):', {
          numeroOS,
          usuario: usuario.nome,
          nivel: usuario.nivel,
          auth_user_id: usuario.auth_user_id,
          mensagem: trimmedMessage,
          todosNumeros: numeros
        });

        // Buscar senha da OS
        if (!usuario.empresa_id) {
          return {
            message: '❌ Erro: Não foi possível identificar sua empresa. Entre em contato com o administrador.'
          };
        }

        if (!usuario.auth_user_id) {
          return {
            message: '❌ Erro: Não foi possível identificar seu ID de técnico. Entre em contato com o administrador.'
          };
        }

        // 🔒 SEGURANÇA: Passar auth_user_id do técnico para verificar se a OS pertence a ele
        const dadosOS = await getSenhaOSPorNumero(numeroOS, usuario.empresa_id, usuario.auth_user_id);
        
        if (!dadosOS) {
          return {
            message: `❌ *Acesso Negado*\n\nA OS #${numeroOS} pertence a outro técnico.\n\nVocê não tem permissão para consultar dados de OS que não estão atribuídas a você como técnico responsável.`
          };
        }

        const message = formatSenhaOSMessage(dadosOS);
        return { message };
      } else {
        // Perguntou sobre senha mas não mencionou número
        return {
          message: '❓ Você perguntou sobre senha da OS, mas não informou o número.\n\nPor favor, mencione o número da OS. Exemplo:\n"Qual a senha da OS 890?"'
        };
      }
    }

    // Verificar se técnico está perguntando sobre uma OS (sem mencionar senha)
    // Exemplo: "qual a os 1196", "os 1196", "me passa dados da os 1196"
    if (usuario.nivel === 'tecnico' && mencionaOS && !mencionaSenha) {
      const numeros = trimmedMessage.match(/\d+/g);
      let numeroOS: string | null = null;
      
      if (numeros && numeros.length > 0) {
        const numerosOS = numeros.filter(n => n.length >= 2 && n.length <= 5);
        numeroOS = numerosOS.length > 0 ? numerosOS[0] : numeros[0];
      }
      
      if (numeroOS && usuario.empresa_id && usuario.auth_user_id) {
        console.log('🔍 Técnico perguntando sobre OS (sem senha):', {
          numeroOS,
          usuario: usuario.nome,
          mensagem: trimmedMessage
        });

        // Verificar se a OS pertence ao técnico
        const dadosOS = await getSenhaOSPorNumero(numeroOS, usuario.empresa_id, usuario.auth_user_id);
        
        if (!dadosOS) {
          return {
            message: `❌ *Acesso Negado*\n\nA OS #${numeroOS} pertence a outro técnico.\n\nVocê não tem permissão para consultar dados de OS que não estão atribuídas a você como técnico responsável.`
          };
        }
        
        // Se a OS pertence ao técnico, deixa passar para o ChatGPT responder normalmente
      }
    }

    // Se não for comando, tentar usar ChatGPT
    const chatGPTDisponivel = isChatGPTAvailable();
    console.log('🔍 Verificando ChatGPT:', {
      disponivel: chatGPTDisponivel,
      temApiKey: !!process.env.OPENAI_API_KEY,
      nivel: usuario.nivel,
      mensagem: trimmedMessage
    });
    
    if (chatGPTDisponivel) {
      console.log('🤖 ChatGPT disponível - processando mensagem com IA');
      console.log('📝 Mensagem para ChatGPT:', trimmedMessage);
      
      // Buscar dados específicos baseado no nível do usuário
      let userData = null;
      try {
        console.log(`📊 Buscando dados para ${usuario.nivel}: ${usuario.nome}...`);
        userData = await getUserDataByLevel(usuario);
        console.log('✅ Dados do usuário obtidos:', {
          nivel: userData?.nivel,
          temDados: !!userData
        });
      } catch (error: any) {
        console.error('⚠️ Erro ao buscar dados do usuário (continuando sem dados):', error.message);
        // Continuar mesmo sem dados
      }
      
      try {
        console.log('🚀 Chamando ChatGPT API...');
        const chatGPTResponse = await getChatGPTResponse(
          trimmedMessage,
          usuario.nome,
          userData
        );

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
    const comandosDisponiveis = usuario.nivel === 'tecnico' 
      ? '\n• /comissoes - Ver suas comissões'
      : '';
    
    return {
      message: `❓ Comando não reconhecido.\n\nComandos disponíveis:${comandosDisponiveis}\n\n💡 Dica: Você pode fazer perguntas sobre ${
        usuario.nivel === 'tecnico' ? 'suas OS e comissões' :
        usuario.nivel === 'financeiro' ? 'contas a pagar e despesas' :
        usuario.nivel === 'atendente' ? 'OS abertas e clientes' :
        usuario.nivel === 'admin' ? 'dados gerais e performance' :
        'o sistema'
      }!`
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
    // ⚠️ VERIFICAÇÃO: Webhook WhatsApp desativado
    if (!WHATSAPP_WEBHOOK_ENABLED) {
      console.log('⚠️ WhatsApp Webhook desativado - ignorando requisição');
      return NextResponse.json(
        { status: 'disabled', message: 'WhatsApp webhook está desativado' },
        { status: 200 }
      );
    }

    // Receber o body da requisição
    const body = await request.json();
    
    // Processar webhook do WhatsApp
    // Estrutura: body.entry[0].changes[0].value.messages[0]
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    const statuses = value?.statuses; // Status de mensagens (delivered, read, etc)
    const contacts = value?.contacts; // Informações de contato

    // IGNORAR eventos que não são mensagens recebidas
    // Se tiver statuses, é um update de status (delivered, read, etc) - IGNORAR
    if (statuses && statuses.length > 0) {
      console.log('ℹ️ Webhook de status ignorado (delivered/read/etc):', {
        statuses: statuses.length,
        status: statuses[0]?.status
      });
      return NextResponse.json({ status: 'ignored', type: 'status_update' }, { status: 200 });
    }

    // Se tiver contacts mas não messages, é update de contato - IGNORAR
    if (contacts && (!messages || messages.length === 0)) {
      console.log('ℹ️ Webhook de contato ignorado:', {
        contacts: contacts.length
      });
      return NextResponse.json({ status: 'ignored', type: 'contact_update' }, { status: 200 });
    }

    // Se não tiver messages, ignorar
    if (!messages || messages.length === 0) {
      console.log('ℹ️ Webhook recebido sem mensagens - ignorando:', {
        hasStatuses: !!statuses,
        hasContacts: !!contacts,
        valueKeys: value ? Object.keys(value) : []
      });
      return NextResponse.json({ status: 'ignored', type: 'no_messages' }, { status: 200 });
    }

    // Processar apenas mensagens recebidas (não enviadas por nós)
    const message = messages[0];
    const from = message.from;
    const messageType = message.type;
    const messageId = message.id;

    // LOG DETALHADO para debug
    console.log('🔍 DEBUG Webhook completo:', {
      hasMessages: !!messages,
      messageCount: messages?.length,
      messageType: messageType,
      from: from,
      messageId: messageId,
      hasContext: !!message.context,
      timestamp: message.timestamp,
      bodyKeys: Object.keys(body),
      valueKeys: Object.keys(value || {}),
      messageKeys: Object.keys(message || {})
    });

    // Verificar se a mensagem foi enviada por nós (tem context)
    // Se tiver context, é uma mensagem que enviamos - IGNORAR
    if (message.context) {
      console.log('ℹ️ Mensagem enviada por nós ignorada (tem context):', {
        messageId,
        from,
        context: message.context
      });
      return NextResponse.json({ status: 'ignored', type: 'outgoing_message' }, { status: 200 });
    }
    
    // Verificar se é uma mensagem de sistema/automática
    if (message.from === value.metadata?.phone_number_id || 
        message.from === value.metadata?.display_phone_number) {
      console.log('ℹ️ Mensagem do próprio sistema ignorada');
      return NextResponse.json({ status: 'ignored', type: 'system_message' }, { status: 200 });
    }

    console.log('📨 Mensagem recebida detectada:', { 
      from, 
      type: messageType, 
      messageId,
      timestamp: message.timestamp 
    });

    // VERIFICAÇÕES RIGOROSAS antes de processar
    // 1. Verificar se é realmente uma mensagem de texto
    if (messageType !== 'text') {
      console.log('ℹ️ Tipo de mensagem não é texto (ignorando):', messageType);
      return NextResponse.json({ status: 'ignored', type: 'not_text' }, { status: 200 });
    }
    
    // 2. Verificar se tem corpo de texto
    if (!message.text?.body) {
      console.log('ℹ️ Mensagem sem corpo de texto (ignorando)');
      return NextResponse.json({ status: 'ignored', type: 'no_text_body' }, { status: 200 });
    }
    
    // 3. Verificar se o campo "from" existe e é válido
    if (!from || typeof from !== 'string' || from.length < 10) {
      console.log('ℹ️ Campo "from" inválido (ignorando):', from);
      return NextResponse.json({ status: 'ignored', type: 'invalid_from' }, { status: 200 });
    }
    
    // 4. Verificar se não é uma mensagem muito antiga (mais de 5 minutos)
    const messageTimestamp = message.timestamp ? parseInt(message.timestamp) : null;
    if (messageTimestamp) {
      const messageDate = new Date(messageTimestamp * 1000);
      const now = new Date();
      const diffMinutes = (now.getTime() - messageDate.getTime()) / (1000 * 60);
      if (diffMinutes > 5) {
        console.log('ℹ️ Mensagem muito antiga (ignorando):', {
          timestamp: messageTimestamp,
          ageMinutes: diffMinutes.toFixed(2)
        });
        return NextResponse.json({ status: 'ignored', type: 'old_message' }, { status: 200 });
      }
    }
    
    // 5. Verificar se não é uma mensagem de template ou sistema
    if (message.text.body.includes('template') || 
        message.text.body.toLowerCase().includes('system') ||
        message.text.body.toLowerCase().includes('automated')) {
      console.log('ℹ️ Mensagem parece ser de sistema/template (ignorando)');
      return NextResponse.json({ status: 'ignored', type: 'system_template' }, { status: 200 });
    }
    
    const messageBody = message.text.body.trim();
    
    // 6. Ignorar mensagens vazias ou muito curtas (menos de 1 caractere)
    if (!messageBody || messageBody.length < 1) {
      console.log('ℹ️ Mensagem vazia ou muito curta (ignorando)');
      return NextResponse.json({ status: 'ignored', type: 'empty_message' }, { status: 200 });
    }

    console.log('💬 Texto recebido (aprovado em todas verificações):', {
      from,
      messageBody: messageBody.substring(0, 50),
      length: messageBody.length
    });

    // Processar mensagem (comando ou ChatGPT)
    const result = await processWhatsAppMessage(from, messageBody);

    // Enviar resposta apenas se houver resultado
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
