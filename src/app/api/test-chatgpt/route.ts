import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTResponse, isChatGPTAvailable } from '@/lib/chatgpt';

/**
 * Rota de teste para verificar se o ChatGPT está funcionando
 * GET /api/test-chatgpt?message=sua mensagem
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testMessage = searchParams.get('message') || 'Olá, como você pode me ajudar?';

    // Verificar se está disponível
    const available = isChatGPTAvailable();
    
    if (!available) {
      return NextResponse.json({
        success: false,
        error: 'ChatGPT não está disponível',
        reason: 'OPENAI_API_KEY não configurada',
        message: 'Configure a variável de ambiente OPENAI_API_KEY para usar o ChatGPT'
      }, { status: 400 });
    }

    // Testar chamada
    console.log('🧪 Testando ChatGPT com mensagem:', testMessage);
    
    const response = await getChatGPTResponse(testMessage, {
      userName: 'Usuário de Teste',
      isTecnico: true,
    });

    if (!response) {
      return NextResponse.json({
        success: false,
        error: 'ChatGPT não retornou resposta',
        message: 'Verifique os logs para mais detalhes'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'ChatGPT está funcionando!',
      testMessage,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro no teste do ChatGPT:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao testar ChatGPT',
      message: error.message,
      details: error.code || error.status
    }, { status: 500 });
  }
}

/**
 * POST para testar com body JSON
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const testMessage = body.message || 'Olá, como você pode me ajudar?';

    // Verificar se está disponível
    const available = isChatGPTAvailable();
    
    if (!available) {
      return NextResponse.json({
        success: false,
        error: 'ChatGPT não está disponível',
        reason: 'OPENAI_API_KEY não configurada'
      }, { status: 400 });
    }

    // Testar chamada
    console.log('🧪 Testando ChatGPT com mensagem:', testMessage);
    
    const response = await getChatGPTResponse(testMessage, {
      userName: body.userName || 'Usuário de Teste',
      isTecnico: body.isTecnico || false,
    });

    if (!response) {
      return NextResponse.json({
        success: false,
        error: 'ChatGPT não retornou resposta'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'ChatGPT está funcionando!',
      testMessage,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro no teste do ChatGPT:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao testar ChatGPT',
      message: error.message
    }, { status: 500 });
  }
}

