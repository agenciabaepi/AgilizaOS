import { NextRequest, NextResponse } from 'next/server';
import { sendOSApprovedNotification, sendOSStatusNotification } from '@/lib/whatsapp-notifications';

export async function POST(request: NextRequest) {
  try {
    const { osId, testType = 'approved' } = await request.json();

    if (!osId) {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🧪 Testando notificação WhatsApp:', {
      osId,
      testType
    });

    let success = false;
    let message = '';

    switch (testType) {
      case 'approved':
        success = await sendOSApprovedNotification(osId);
        message = success ? 'Notificação de OS aprovada enviada com sucesso!' : 'Falha ao enviar notificação de OS aprovada';
        break;

      case 'status':
        success = await sendOSStatusNotification(osId, 'Aprovado');
        message = success ? 'Notificação de status enviada com sucesso!' : 'Falha ao enviar notificação de status';
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de teste inválido. Use "approved" ou "status"' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: success,
      message: message,
      testType: testType,
      osId: osId
    });

  } catch (error) {
    console.error('❌ Erro interno no teste de notificação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
