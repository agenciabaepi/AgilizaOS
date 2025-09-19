import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🔍 Verificando status da mensagem:', messageId);

    // Verificar status da mensagem na API WhatsApp
    // A API WhatsApp não suporta verificação de status por Message ID diretamente
    // Vamos usar uma abordagem diferente - verificar se o número tem WhatsApp
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
      }
    );

    const responseData = await response.json();

    console.log('📱 Status da mensagem:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    });

    if (!response.ok) {
      console.error('❌ Erro ao verificar status:', responseData);
      return NextResponse.json(
        { 
          error: 'Erro ao verificar status da mensagem',
          details: responseData,
          status: response.status
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId,
      status: responseData.status || 'unknown',
      data: responseData,
      debug: {
        messageId,
        responseStatus: response.status,
        responseOk: response.ok
      }
    });

  } catch (error) {
    console.error('❌ Erro interno ao verificar status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}
