import { NextRequest, NextResponse } from 'next/server';

/**
 * API para testar webhooks N8N individualmente
 */

export async function POST(request: NextRequest) {
  try {
    const { webhook_url, payload } = await request.json();

    if (!webhook_url) {
      return NextResponse.json(
        { error: 'URL do webhook é obrigatória' },
        { status: 400 }
      );
    }

    console.log('🔍 Testando webhook específico:', {
      url: webhook_url,
      payload: payload ? 'Fornecido' : 'Usando padrão'
    });

    const testPayload = payload || {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Teste de conectividade N8N',
      tipo: 'teste-manual'
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

    console.log('📊 Resposta do webhook:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseData,
      webhook_url: webhook_url,
      payload_sent: testPayload,
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

