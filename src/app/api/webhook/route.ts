import { after, NextRequest, NextResponse } from 'next/server';
import { WHATSAPP_WEBHOOK_ENABLED } from '@/config/whatsapp-config';
import { WHATSAPP_CRM_ENABLED } from '@/config/whatsapp-crm-config';
import { processWhatsAppCrmWebhook } from '@/lib/whatsapp-crm/webhook-handler';
import { processarWebhookSistema, temMensagemParaSistema } from '@/lib/whatsapp-sistema/webhook';

/** Assistentes respondem depois do 200 (via `after`), dentro deste limite */
export const maxDuration = 60;

/**
 * URL antiga do webhook da Meta. Mesmo comportamento de /api/whatsapp/crm/webhook.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hubMode = searchParams.get('hub.mode');
  const hubVerifyToken = searchParams.get('hub.verify_token')?.trim();
  const hubChallenge = searchParams.get('hub.challenge');

  if (!hubMode || !hubVerifyToken || !hubChallenge) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 });
  }

  if (hubVerifyToken === process.env.WHATSAPP_VERIFY_TOKEN?.trim()) {
    return new NextResponse(hubChallenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Token de verificação inválido' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!WHATSAPP_WEBHOOK_ENABLED) {
    return NextResponse.json({ status: 'disabled' }, { status: 200 });
  }

  try {
    const body = await request.json();

    if (temMensagemParaSistema(body)) {
      after(() => processarWebhookSistema(body).catch((err) => console.error('Webhook sistema error:', err)));
    }

    if (WHATSAPP_CRM_ENABLED && body.object === 'whatsapp_business_account') {
      try {
        await processWhatsAppCrmWebhook(body);
      } catch (crmErr) {
        console.error('CRM webhook processing failed:', crmErr);
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Erro no webhook do WhatsApp:', error);
    // 200 mesmo em erro para a Meta não reenviar
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
