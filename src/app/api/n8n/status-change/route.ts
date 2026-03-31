import { NextRequest, NextResponse } from 'next/server';
import { sendOSApprovedNotification, sendOSStatusNotification } from '@/lib/whatsapp-notifications';

/**
 * API para processar mudanças de status via webhook/hook
 * Agora envia mensagens diretamente pelo WhatsApp (sem N8N)
 */
export async function POST(request: NextRequest) {
  try {
    const { os_id, status_anterior, status_novo, status_tecnico_anterior, status_tecnico_novo, empresa_id } = await request.json();

    if (!os_id) {
      return NextResponse.json(
        { error: 'os_id é obrigatório' },
        { status: 400 }
      );
    }

    console.log('📱 WhatsApp: Processando mudança de status via hook:', {
      os_id,
      status_anterior,
      status_novo,
      status_tecnico_anterior,
      status_tecnico_novo,
      empresa_id
    });

    // Decidir qual notificação enviar baseado no status
    const normalize = (s: string) => (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const statusNormalizado = normalize(status_novo || '');
    
    let notificationSuccess = false;
    if (statusNormalizado === 'APROVADO') {
      console.log('🎉 WhatsApp: Status APROVADO detectado via hook - enviando notificação de aprovação');
      notificationSuccess = await sendOSApprovedNotification(os_id);
    } else if (status_novo) {
      console.log('🔄 WhatsApp: Mudança de status geral via hook - enviando notificação de status');
      notificationSuccess = await sendOSStatusNotification(os_id, status_novo);
    }

    if (notificationSuccess) {
      console.log('✅ WhatsApp: Notificação via hook enviada com sucesso');
      return NextResponse.json({
        success: true,
        message: 'Notificação WhatsApp enviada com sucesso',
        os_id: os_id,
        status: status_novo
      });
    } else {
      console.warn('⚠️ WhatsApp: Falha ao enviar notificação via hook');
      return NextResponse.json(
        { error: 'Falha ao enviar notificação WhatsApp', os_id: os_id },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ WhatsApp: Erro interno ao processar mudança de status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
