import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { getOrCreateConversa, appendMensagem, findClienteByPhone } from '@/lib/whatsapp-crm/conversations';
import { syncOsContexto } from '@/lib/whatsapp-crm/os-context';
import { toWhatsAppId } from '@/lib/whatsapp-crm/normalize-phone';
import { WHATSAPP_WEBHOOK_ENABLED } from '@/config/whatsapp-config';

/**
 * Webhook CRM — processa mensagens inbound da Cloud API.
 * Configure em Meta Developer: POST /api/whatsapp/crm/webhook
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
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

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient();

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value?.messages?.length) continue;

        const phoneNumberId = value.metadata?.phone_number_id;

        const { data: config } = await supabase
          .from('whatsapp_empresa_config')
          .select('empresa_id, phone_number_id, ativo')
          .eq('phone_number_id', phoneNumberId)
          .eq('ativo', true)
          .maybeSingle();

        if (!config) continue;

        for (const message of value.messages) {
          const from = message.from as string;
          const waId = toWhatsAppId(from);
          const contactName = value.contacts?.[0]?.profile?.name;

          let conteudo = '';
          if (message.type === 'text') {
            conteudo = message.text?.body ?? '';
          } else {
            conteudo = `[${message.type}]`;
          }

          const cliente = await findClienteByPhone(supabase, config.empresa_id, from);

          const conversa = await getOrCreateConversa(supabase, {
            empresa_id: config.empresa_id,
            telefone: from,
            wa_id: waId,
            nome_contato: contactName,
            cliente_id: cliente?.id,
          });

          if (conversa.os_id) {
            await syncOsContexto(supabase, {
              conversa_id: conversa.id,
              os_id: conversa.os_id,
              empresa_id: config.empresa_id,
            });
          }

          await appendMensagem(supabase, {
            conversa_id: conversa.id,
            empresa_id: config.empresa_id,
            direcao: 'entrada',
            tipo: message.type === 'text' ? 'texto' : message.type,
            conteudo,
            meta_message_id: message.id,
            status_entrega: 'entregue',
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('CRM webhook error:', err);
    return NextResponse.json({ success: true });
  }
}
