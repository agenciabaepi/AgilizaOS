import { NextRequest, NextResponse } from 'next/server';
import { WHATSAPP_WEBHOOK_ENABLED } from '@/config/whatsapp-config';
import { processWhatsAppCrmWebhook } from '@/lib/whatsapp-crm/webhook-handler';

/**
 * Webhook CRM — processa mensagens inbound da Cloud API.
 * Configure em Meta Developer: POST /api/whatsapp/crm/webhook
 * (Também processado via /api/webhook se a Meta apontar para a URL antiga.)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token')?.trim();
  const challenge = searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (!mode || !token || !challenge) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 });
  }

  if (mode === 'subscribe' && expected && token === expected) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  if (!WHATSAPP_WEBHOOK_ENABLED) {
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    const body = await req.json();
    const result = await processWhatsAppCrmWebhook(body);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('CRM webhook error:', err);
    return NextResponse.json({ success: false, error: 'internal' }, { status: 500 });
  }
}
