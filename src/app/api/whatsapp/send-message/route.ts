import { NextRequest, NextResponse } from 'next/server';

interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  text: {
    body: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, to, message } = await request.json();

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

    const whatsappMessage: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: phoneWithCountryCode,
      type: 'text',
      text: {
        body: message
      }
    };

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

    return NextResponse.json({
      success: true,
      messageId: responseData.messages?.[0]?.id,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Erro interno ao enviar mensagem WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
