import { NextRequest, NextResponse } from 'next/server';
import { isChatGPTAvailable } from '@/lib/chatgpt';

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
          apiKey: process.env.OPENAI_API_KEY ? '✅ Configurado' : '❌ Não configurado',
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

