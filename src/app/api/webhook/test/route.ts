import { NextRequest, NextResponse } from 'next/server';
import { processWhatsAppMessage } from '../route';

/**
 * Rota de teste para simular recebimento de mensagem do WhatsApp
 * Útil para testar se o processamento está funcionando
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, message } = body;

    if (!from || !message) {
      return NextResponse.json({
        error: 'Parâmetros obrigatórios: from (número) e message (texto)'
      }, { status: 400 });
    }

    console.log('🧪 TESTE: Simulando mensagem do WhatsApp:', { from, message });

    // Processar mensagem
    const result = await processWhatsAppMessage(from, message);

    if (result.message) {
      console.log('✅ TESTE: Resposta gerada:', result.message);
      
      // Opcional: enviar resposta real (descomente se quiser testar envio)
      // const sent = await sendWhatsAppTextMessage(from, result.message);
      
      return NextResponse.json({
        success: true,
        from,
        message,
        response: result.message,
        note: 'Esta é uma simulação. Para enviar a resposta real, descomente o código de envio.'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Nenhuma resposta foi gerada'
    }, { status: 500 });

  } catch (error: any) {
    console.error('❌ Erro no teste:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

