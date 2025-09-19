import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extrair parâmetros da query string
    const hubMode = searchParams.get('hub.mode');
    const hubVerifyToken = searchParams.get('hub.verify_token');
    const hubChallenge = searchParams.get('hub.challenge');
    
    console.log('🔍 Webhook GET - Validação:', {
      hubMode,
      hubVerifyToken,
      hubChallenge,
      expectedToken: process.env.WHATSAPP_VERIFY_TOKEN
    });
    
    // Verificar se todos os parâmetros necessários estão presentes
    if (!hubMode || !hubVerifyToken || !hubChallenge) {
      console.error('❌ Parâmetros obrigatórios ausentes');
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes' },
        { status: 400 }
      );
    }
    
    // Verificar se o token de verificação está correto
    if (hubVerifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ Token de verificação válido - Respondendo com challenge');
      return new NextResponse(hubChallenge, { status: 200 });
    } else {
      console.error('❌ Token de verificação inválido');
      return NextResponse.json(
        { error: 'Token de verificação inválido' },
        { status: 403 }
      );
    }
    
  } catch (error) {
    console.error('❌ Erro na validação GET:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Receber o body da requisição
    const body = await request.json();
    
    console.log('📨 Webhook POST - Mensagem recebida:', JSON.stringify(body, null, 2));
    
    // Aqui você pode adicionar lógica adicional para processar as mensagens
    // Por exemplo: salvar no banco de dados, enviar notificações, etc.
    
    return NextResponse.json(
      { status: 'success', message: 'Webhook recebido com sucesso' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ Erro no recebimento POST:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
