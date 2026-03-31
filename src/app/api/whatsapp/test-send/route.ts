import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Número de telefone e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Formatar número de telefone (remover caracteres especiais e adicionar código do país)
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

    console.log('🧪 Teste - Enviando mensagem WhatsApp:', {
      to: phoneWithCountryCode,
      message: message.substring(0, 100) + '...'
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

    if (!response.ok) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', responseData);
      return NextResponse.json(
        { 
          error: 'Erro ao enviar mensagem WhatsApp',
          details: responseData 
        },
        { status: response.status }
      );
    }

    console.log('✅ Mensagem WhatsApp enviada com sucesso:', responseData);

    return NextResponse.json({
      success: true,
      messageId: responseData.messages?.[0]?.id,
      data: responseData,
      sentTo: phoneWithCountryCode,
      message: 'Mensagem de teste enviada com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro interno ao enviar mensagem WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
