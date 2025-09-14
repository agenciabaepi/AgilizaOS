import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/chromium';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();
    
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Número de telefone e mensagem são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Validar formato do número (deve incluir código do país)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Número de telefone inválido' },
        { status: 400 }
      );
    }
    
    // Enviar mensagem via WhatsApp Web
    const result = await sendWhatsAppMessage(cleanPhone, message);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        phoneNumber: cleanPhone
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Erro ao enviar mensagem',
          details: result.error 
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para testar conexão com WhatsApp Web
export async function GET() {
  try {
    // Aqui você pode implementar uma verificação de status
    // Por exemplo, verificar se o WhatsApp Web está conectado
    
    return NextResponse.json({
      status: 'ready',
      message: 'WhatsApp Web está pronto para uso',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao verificar status do WhatsApp:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Erro ao verificar status do WhatsApp' 
      },
      { status: 500 }
    );
  }
}