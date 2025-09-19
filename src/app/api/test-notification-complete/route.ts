import { NextRequest, NextResponse } from 'next/server';
import { sendOSStatusNotification } from '@/lib/whatsapp-notifications';

export async function POST(req: NextRequest) {
  try {
    const { osId, status } = await req.json();
    
    if (!osId || !status) {
      return NextResponse.json({ 
        error: 'ID da OS e status são obrigatórios' 
      }, { status: 400 });
    }

    console.log('🧪 Testando notificação completa para OS:', { osId, status });

    // Testar o envio da notificação
    const notificationSent = await sendOSStatusNotification(osId, status);

    if (notificationSent) {
      console.log('✅ Notificação de teste enviada com sucesso!');
      return NextResponse.json({ 
        success: true, 
        message: 'Notificação de teste enviada com sucesso!',
        osId,
        status,
        notificationSent: true
      });
    } else {
      console.log('⚠️ Notificação de teste não foi enviada');
      return NextResponse.json({ 
        success: false, 
        message: 'Notificação de teste não foi enviada',
        osId,
        status,
        notificationSent: false
      });
    }

  } catch (error: any) {
    console.error('❌ Erro no teste de notificação completa:', error);
    return NextResponse.json({ 
      error: 'Erro interno no teste de notificação', 
      details: error.message 
    }, { status: 500 });
  }
}
