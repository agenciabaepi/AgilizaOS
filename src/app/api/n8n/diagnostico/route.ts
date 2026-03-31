import { NextRequest, NextResponse } from 'next/server';

/**
 * API de diagnóstico para verificar configuração N8N
 */

export async function GET() {
  try {
    // Verificar variáveis de ambiente
    const envCheck = {
      N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ? '✅ Configurado' : '❌ Não configurado',
      N8N_WEBHOOK_NOVA_OS_URL: process.env.N8N_WEBHOOK_NOVA_OS_URL ? '✅ Configurado' : '❌ Não configurado',
      N8N_WEBHOOK_STATUS_URL: process.env.N8N_WEBHOOK_STATUS_URL ? '✅ Configurado' : '❌ Não configurado',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? '✅ Configurado' : '❌ Não configurado'
    };

    // URLs dos webhooks (sem mostrar valores completos por segurança)
    const webhookUrls = {
      N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ? 
        process.env.N8N_WEBHOOK_URL.substring(0, 50) + '...' : 'Não configurado',
      N8N_WEBHOOK_NOVA_OS_URL: process.env.N8N_WEBHOOK_NOVA_OS_URL ? 
        process.env.N8N_WEBHOOK_NOVA_OS_URL.substring(0, 50) + '...' : 'Não configurado',
      N8N_WEBHOOK_STATUS_URL: process.env.N8N_WEBHOOK_STATUS_URL ? 
        process.env.N8N_WEBHOOK_STATUS_URL.substring(0, 50) + '...' : 'Não configurado'
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      webhook_urls: webhookUrls,
      message: 'Diagnóstico N8N concluído'
    });

  } catch (error) {
    console.error('❌ Erro no diagnóstico N8N:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { webhook_url } = await request.json();

    if (!webhook_url) {
      return NextResponse.json(
        { error: 'URL do webhook é obrigatória' },
        { status: 400 }
      );
    }

    // Testar conectividade com o webhook
    console.log('🔍 Testando conectividade com webhook:', webhook_url);

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Teste de conectividade N8N'
    };

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseData,
      webhook_url: webhook_url.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro ao testar webhook',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
