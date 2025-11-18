import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifica se o webhook está configurado corretamente no WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Variáveis de ambiente do WhatsApp não configuradas' },
        { status: 500 }
      );
    }

    // Verificar webhooks configurados
    const webhooksResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/subscribed_apps`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const webhooksData = await webhooksResponse.json();

    // Verificar configuração do webhook no app
    const appId = process.env.WHATSAPP_APP_ID;
    let appWebhookData = null;
    
    if (appId) {
      try {
        const appWebhookResponse = await fetch(
          `https://graph.facebook.com/v18.0/${appId}/subscriptions`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        appWebhookData = await appWebhookResponse.json();
      } catch (error) {
        console.log('⚠️ Não foi possível verificar webhook do app:', error);
      }
    }

    return NextResponse.json({
      success: true,
      webhookUrl: `https://gestaoconsert.com.br/api/webhook`,
      phoneNumberId,
      subscribedApps: webhooksData,
      appWebhook: appWebhookData,
      instructions: {
        step1: 'Acesse: https://developers.facebook.com/apps',
        step2: 'Selecione seu app',
        step3: 'Vá em WhatsApp > Configuration',
        step4: 'Em "Webhook", configure:',
        step5: {
          callbackUrl: 'https://gestaoconsert.com.br/api/webhook',
          verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'CONFIGURE_VERIFY_TOKEN',
          webhookFields: ['messages']
        },
        step6: 'Clique em "Verify and Save"',
        step7: 'Certifique-se de que o campo "messages" está marcado'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar webhook:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao verificar webhook',
        details: error.message 
      },
      { status: 500 }
    );
  }
}



