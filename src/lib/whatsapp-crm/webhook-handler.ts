import { createAdminClient } from '@/lib/supabaseClient';
import { getOrCreateConversa, appendMensagem, findClienteByPhone } from './conversations';
import { syncOsContexto } from './os-context';
import { toWhatsAppId } from './normalize-phone';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type MetaMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
};

type MetaWebhookValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { profile?: { name?: string } }[];
  messages?: MetaMessage[];
  message_echoes?: MetaMessage[];
};

function mapMessageType(metaType: string): string {
  const map: Record<string, string> = {
    text: 'texto',
    image: 'imagem',
    document: 'documento',
    audio: 'audio',
    video: 'video',
    template: 'template',
  };
  return map[metaType] ?? 'sistema';
}

function extractContent(message: MetaMessage): string {
  if (message.type === 'text') {
    return message.text?.body ?? '';
  }
  if (message.type === 'image' && message.text?.body) {
    return message.text.body;
  }
  return `[${message.type ?? 'mensagem'}]`;
}

async function processInboundMessage(
  supabase: SupabaseAdmin,
  config: { empresa_id: string },
  value: MetaWebhookValue,
  message: MetaMessage,
  options?: { isEcho?: boolean }
) {
  if (!message.from || !message.id) return;

  const from = message.from;
  const waId = toWhatsAppId(from);
  const contactName = value.contacts?.[0]?.profile?.name;
  const conteudo = extractContent(message);
  const tipo = mapMessageType(message.type ?? 'text');

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

  const { data: existing } = await supabase
    .from('whatsapp_mensagens')
    .select('id')
    .eq('meta_message_id', message.id)
    .maybeSingle();

  if (existing) return;

  await appendMensagem(supabase, {
    conversa_id: conversa.id,
    empresa_id: config.empresa_id,
    direcao: options?.isEcho ? 'saida' : 'entrada',
    tipo,
    conteudo,
    meta_message_id: message.id,
    status_entrega: options?.isEcho ? 'enviada' : 'entregue',
  });
}

async function resolveConfig(supabase: SupabaseAdmin, phoneNumberId: string | undefined) {
  if (!phoneNumberId) return null;

  const id = String(phoneNumberId);

  const { data: config } = await supabase
    .from('whatsapp_empresa_config')
    .select('empresa_id, phone_number_id, ativo')
    .eq('phone_number_id', id)
    .eq('ativo', true)
    .maybeSingle();

  if (config) return config;

  const { data: configs } = await supabase
    .from('whatsapp_empresa_config')
    .select('empresa_id, phone_number_id, ativo')
    .eq('ativo', true);

  if (configs?.length === 1) {
    console.warn(
      `[CRM webhook] phone_number_id ${id} não encontrado; usando única config ativa (${configs[0].phone_number_id})`
    );
    return configs[0];
  }

  console.warn(`[CRM webhook] Nenhuma config ativa para phone_number_id ${id}`);
  return null;
}

/**
 * Processa payload inbound da Meta Cloud API e persiste no inbox CRM.
 * Deve ser chamado tanto em /api/whatsapp/crm/webhook quanto em /api/webhook.
 */
export async function processWhatsAppCrmWebhook(body: {
  object?: string;
  entry?: { changes?: { value?: MetaWebhookValue }[] }[];
}) {
  if (body.object !== 'whatsapp_business_account') {
    return { processed: 0, skipped: true };
  }

  const supabase = createAdminClient();
  let processed = 0;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      const config = await resolveConfig(supabase, value.metadata?.phone_number_id);
      if (!config) continue;

      const inbound = value.messages ?? [];
      const echoes = value.message_echoes ?? [];

      for (const message of inbound) {
        try {
          await processInboundMessage(supabase, config, value, message);
          processed += 1;
        } catch (err) {
          console.error('[CRM webhook] Erro ao salvar mensagem inbound:', err);
        }
      }

      for (const message of echoes) {
        try {
          await processInboundMessage(supabase, config, value, message, { isEcho: true });
          processed += 1;
        } catch (err) {
          console.error('[CRM webhook] Erro ao salvar message_echo:', err);
        }
      }
    }
  }

  return { processed, skipped: false };
}
