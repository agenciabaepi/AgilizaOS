import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando configuração do WhatsApp Business...');

    // Verificar informações da conta WhatsApp Business
    const businessResponse = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
      }
    );

    const businessData = await businessResponse.json();

    console.log('📱 Dados da conta WhatsApp Business:', {
      status: businessResponse.status,
      ok: businessResponse.ok,
      data: businessData
    });

    // Verificar webhooks configurados
    const webhooksResponse = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/subscribed_apps`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
      }
    );

    const webhooksData = await webhooksResponse.json();

    console.log('🔗 Webhooks configurados:', {
      status: webhooksResponse.status,
      ok: webhooksResponse.ok,
      data: webhooksData
    });

    // Verificar status da conta
    const statusResponse = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/message_templates`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
      }
    );

    const statusData = await statusResponse.json();

    console.log('📋 Status da conta:', {
      status: statusResponse.status,
      ok: statusResponse.ok,
      data: statusData
    });

    return NextResponse.json({
      success: true,
      business: {
        status: businessResponse.status,
        ok: businessResponse.ok,
        data: businessData
      },
      webhooks: {
        status: webhooksResponse.status,
        ok: webhooksResponse.ok,
        data: webhooksData
      },
      accountStatus: {
        status: statusResponse.status,
        ok: statusResponse.ok,
        data: statusData
      },
      debug: {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN
      }
    });

  } catch (error) {
    console.error('❌ Erro interno ao verificar configuração:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}
