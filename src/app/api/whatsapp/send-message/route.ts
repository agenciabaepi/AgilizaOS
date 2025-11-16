import { NextRequest, NextResponse } from 'next/server';

interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text?: string;
        image?: {
          link?: string;
          id?: string;
        };
      }>;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, to, message, useTemplate, templateName, templateParams } = body;

    // Usar 'to' se disponível, senão usar 'phoneNumber'
    const phone = to || phoneNumber;

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Número de telefone e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Formatar número de telefone (remover caracteres especiais e adicionar código do país)
    const formattedPhone = phone.replace(/\D/g, '');
    const phoneWithCountryCode = formattedPhone.startsWith('55') 
      ? formattedPhone 
      : `55${formattedPhone}`;

    // Verificar se deve usar template (para números fora da janela de 24h)
    // Por padrão, vamos SEMPRE usar template para garantir que funcione
    const shouldUseTemplate = useTemplate !== false; // Default: true
    const template = templateName || process.env.WHATSAPP_TEMPLATE_NAME || 'os_nova_v5';

    let whatsappMessage: WhatsAppMessage;

    if (shouldUseTemplate && template) {
      // Usar template message (funciona fora da janela de 24h)
      const components: any[] = [];

      // Adicionar header se o template tiver (geralmente é uma imagem)
      // O template os_nova_v5 tem header OBRIGATÓRIO com imagem do logo
      if (templateParams?.header && templateParams.header.length > 0) {
        components.push({
          type: 'header',
          parameters: templateParams.header
        });
        console.log('📷 Adicionando header com imagem ao template');
      } else {
        // O template os_nova_v5 requer header com imagem
        // Se não tiver logo, usar uma imagem padrão ou deixar vazio (pode dar erro)
        // Por enquanto, vamos tentar sem header e ver o erro específico
        console.log('⚠️ Template requer header mas nenhum foi fornecido - tentando sem header');
      }

      // Adicionar body com parâmetros
      const bodyParams = templateParams?.body || [
        {
          type: 'text',
          text: message
        }
      ];

      if (bodyParams.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParams
        });
      }

      whatsappMessage = {
        messaging_product: 'whatsapp',
        to: phoneWithCountryCode,
        type: 'template',
        template: {
          name: template,
          language: {
            code: 'pt_BR'
          },
          components: components
        }
      };
      console.log('📱 Usando template message:', template, 'com', components.length, 'componentes (header:', !!templateParams?.header, ', body:', bodyParams.length, 'parâmetros)');
    } else {
      // Usar mensagem de texto normal (só funciona dentro da janela de 24h)
      whatsappMessage = {
        messaging_product: 'whatsapp',
        to: phoneWithCountryCode,
        type: 'text',
        text: {
          body: message
        }
      };
      console.log('📱 Usando mensagem de texto (requer janela de 24h)');
    }

    console.log('📱 Enviando mensagem WhatsApp:', {
      to: phoneWithCountryCode,
      message: message.substring(0, 100) + '...'
    });

    // 🔍 DEBUG: Verificar se o token está sendo lido do .env
    console.log('🔑 DEBUG Token:', {
      tokenExiste: !!process.env.WHATSAPP_ACCESS_TOKEN,
      tokenLength: process.env.WHATSAPP_ACCESS_TOKEN?.length,
      tokenPrimeiros10: process.env.WHATSAPP_ACCESS_TOKEN?.substring(0, 10),
      tokenUltimos10: process.env.WHATSAPP_ACCESS_TOKEN?.substring(process.env.WHATSAPP_ACCESS_TOKEN.length - 10)
    });

    // 🔍 DEBUG: Verificar Phone Number ID
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      console.error('❌ WHATSAPP_PHONE_NUMBER_ID não está configurado!');
      return NextResponse.json(
        { error: 'WHATSAPP_PHONE_NUMBER_ID não está configurado nas variáveis de ambiente' },
        { status: 500 }
      );
    }

    console.log('📱 DEBUG Phone Number ID:', {
      phoneNumberId,
      phoneNumberIdLength: phoneNumberId.length
    });

    const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    console.log('🌐 URL da API:', apiUrl);

    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(whatsappMessage),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', responseData);
      
      // Mensagem de erro mais detalhada
      const errorMessage = responseData?.error?.message || 'Erro desconhecido';
      const errorCode = responseData?.error?.code;
      const errorSubcode = responseData?.error?.error_subcode;
      
      // Verificar se é erro de Phone Number ID inválido
      if (errorCode === 100 && errorSubcode === 33) {
        console.error('❌ ERRO CRÍTICO: Phone Number ID inválido ou sem permissões!');
        console.error('📱 Phone Number ID usado:', phoneNumberId);
        console.error('💡 Verifique se o WHATSAPP_PHONE_NUMBER_ID está correto no .env');
        console.error('💡 Verifique se o token tem permissões para este Phone Number ID');
      }
      
      return NextResponse.json(
        { 
          error: 'Erro ao enviar mensagem WhatsApp',
          details: responseData,
          phoneNumberId: phoneNumberId,
          suggestion: errorCode === 100 && errorSubcode === 33 
            ? 'Verifique se o WHATSAPP_PHONE_NUMBER_ID está correto e se o token tem permissões'
            : undefined
        },
        { status: response.status }
      );
    }

    console.log('✅ Mensagem WhatsApp enviada com sucesso:', responseData);

    // Verificar se há informações de contato
    const contact = responseData.contacts?.[0];
    const messageId = responseData.messages?.[0]?.id;
    
    // Log detalhado
    console.log('📊 Detalhes da entrega:', {
      messageId,
      to: phoneWithCountryCode,
      contact: contact ? {
        input: contact.input,
        wa_id: contact.wa_id,
        status: contact.wa_id ? 'Número encontrado no WhatsApp' : 'Número não encontrado'
      } : 'Sem informações de contato',
      warning: !contact?.wa_id ? '⚠️ O número pode não estar cadastrado no WhatsApp ou não estar na janela de 24h' : undefined
    });

    return NextResponse.json({
      success: true,
      messageId,
      data: responseData,
      contact: contact,
      warning: !contact?.wa_id ? 'O número pode não estar cadastrado no WhatsApp ou não estar na janela de 24 horas. Verifique se o número iniciou uma conversa nas últimas 24h.' : undefined,
      formattedPhone: phoneWithCountryCode
    });

  } catch (error) {
    console.error('❌ Erro interno ao enviar mensagem WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
