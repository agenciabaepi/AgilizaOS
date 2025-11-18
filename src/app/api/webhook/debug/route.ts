import { NextRequest, NextResponse } from 'next/server';
import { isChatGPTAvailable, getChatGPTResponse } from '@/lib/chatgpt';

/**
 * Rota de debug para verificar configuração do webhook
 */
export async function GET(request: NextRequest) {
  try {
    const whatsappConfigured = !!(
      process.env.WHATSAPP_PHONE_NUMBER_ID && 
      process.env.WHATSAPP_ACCESS_TOKEN
    );

    const chatgptConfigured = isChatGPTAvailable();
    const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
    const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 7) || 'N/A';

    // Testar ChatGPT se estiver configurado
    let chatGPTTest = null;
    if (chatgptConfigured) {
      try {
        const testResponse = await getChatGPTResponse('Olá', { userName: 'Teste' });
        chatGPTTest = {
          success: !!testResponse,
          responseLength: testResponse?.length || 0,
          responsePreview: testResponse?.substring(0, 50) || 'N/A'
        };
      } catch (error: any) {
        chatGPTTest = {
          success: false,
          error: error.message
        };
      }
    }

    return NextResponse.json({
      status: 'ok',
      config: {
        whatsapp: {
          configured: whatsappConfigured,
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ Configurado' : '❌ Não configurado',
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? '✅ Configurado' : '❌ Não configurado',
          verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? '✅ Configurado' : '❌ Não configurado',
        },
        chatgpt: {
          configured: chatgptConfigured,
          apiKey: process.env.OPENAI_API_KEY ? `✅ Configurado (${apiKeyLength} chars, prefix: ${apiKeyPrefix}...)` : '❌ Não configurado',
          test: chatGPTTest
        }
      },
      webhookUrl: process.env.NEXT_PUBLIC_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/webhook`
        : 'Não configurado',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}

