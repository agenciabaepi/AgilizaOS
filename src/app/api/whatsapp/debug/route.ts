import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar variáveis de ambiente
    const envCheck = {
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ Configurado' : '❌ Não configurado',
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? '✅ Configurado' : '❌ Não configurado',
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? '✅ Configurado' : '❌ Não configurado',
      WHATSAPP_APP_ID: process.env.WHATSAPP_APP_ID ? '✅ Configurado' : '❌ Não configurado',
      WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ? '✅ Configurado' : '❌ Não configurado',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? '✅ Configurado' : '❌ Não configurado'
    };

    console.log('🔍 Debug - Variáveis de ambiente WhatsApp:', envCheck);

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Debug info coletado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro no debug:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Número de telefone e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se as variáveis estão configuradas
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
      return NextResponse.json(
        { 
          error: 'Variáveis de ambiente do WhatsApp não configuradas',
          env: {
            WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
            WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN
          }
        },
        { status: 500 }
      );
    }

    // Formatar número de telefone
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const phoneWithCountryCode = formattedPhone.startsWith('55') 
      ? formattedPhone 
      : `55${formattedPhone}`;

    const whatsappMessage = {
      messaging_product: 'whatsapp',
      to: phoneWithCountryCode,
      type: 'text',
      text: {
        body: message
      }
    };

    console.log('🧪 Debug - Tentando enviar mensagem WhatsApp:', {
      to: phoneWithCountryCode,
      message: message.substring(0, 50) + '...',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
    });

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
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

    console.log('📱 Debug - Resposta do WhatsApp API:', {
      status: response.status,
      data: responseData
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Erro ao enviar mensagem WhatsApp',
          details: responseData,
          status: response.status
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: responseData.messages?.[0]?.id,
      data: responseData,
      sentTo: phoneWithCountryCode,
      message: 'Mensagem de debug enviada com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro interno no debug WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
