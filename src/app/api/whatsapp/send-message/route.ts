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

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
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
