import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando status da conta WhatsApp...');

    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Variáveis de ambiente não configuradas' },
        { status: 500 }
      );
    }

    // 1. Verificar informações básicas da conta
    console.log('📱 Verificando informações básicas da conta...');
    const accountResponse = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
      }
    );

    const accountData = await accountResponse.json();
    console.log('📱 Resposta da conta:', accountData);

    // 2. Verificar status de verificação
    console.log('✅ Verificando status de verificação...');
    const verificationResponse = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=code_verification_status,quality_rating,account_status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verificationData = await verificationResponse.json();
    console.log('✅ Status de verificação:', verificationData);

    // 3. Verificar templates disponíveis
    console.log('📋 Verificando templates disponíveis...');
    const templatesResponse = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/message_templates`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
      }
    );

    const templatesData = await templatesResponse.json();
    console.log('📋 Templates disponíveis:', templatesData);

    // 4. Verificar webhooks
    console.log('🔗 Verificando webhooks...');
    const webhooksResponse = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/subscribed_apps`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
      }
    );

    const webhooksData = await webhooksResponse.json();
    console.log('🔗 Webhooks:', webhooksData);

    // 5. Testar envio de mensagem simples
    console.log('🧪 Testando envio de mensagem...');
    const testMessage = {
      messaging_product: 'whatsapp',
      to: '5512988353971',
      type: 'text',
      text: {
        body: '🧪 *TESTE DE STATUS*\n\nVerificando se a conta ainda está funcionando...\n\n_Consert - Sistema de Gestão_'
      }
    };

    const sendResponse = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      }
    );

    const sendData = await sendResponse.json();
    console.log('🧪 Resposta do teste de envio:', sendData);

    return NextResponse.json({
      success: true,
      message: 'Status da conta WhatsApp verificado',
      data: {
        account: {
          status: accountResponse.status,
          data: accountData,
          ok: accountResponse.ok
        },
        verification: {
          status: verificationResponse.status,
          data: verificationData,
          ok: verificationResponse.ok
        },
        templates: {
          status: templatesResponse.status,
          data: templatesData,
          ok: templatesResponse.ok
        },
        webhooks: {
          status: webhooksResponse.status,
          data: webhooksData,
          ok: webhooksResponse.ok
        },
        testSend: {
          status: sendResponse.status,
          data: sendData,
          ok: sendResponse.ok
        }
      },
      summary: {
        accountWorking: accountResponse.ok,
        verificationWorking: verificationResponse.ok,
        templatesWorking: templatesResponse.ok,
        webhooksWorking: webhooksResponse.ok,
        sendWorking: sendResponse.ok,
        allWorking: accountResponse.ok && verificationResponse.ok && templatesResponse.ok && webhooksResponse.ok && sendResponse.ok
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status da conta:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}
