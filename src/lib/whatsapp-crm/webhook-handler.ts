import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { getOrCreateConversa, appendMensagem, findClienteByPhone } from './conversations';
import { responderComIA } from './assistente-ia';
import { syncOsContexto } from './os-context';
import { toWhatsAppId } from './normalize-phone';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type MetaMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  /** Resposta a botão de template */
  button?: { text?: string; payload?: string };
};

function respostaDeBotao(message: MetaMessage): string | null {
  if (message.type === 'interactive') {
    return message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? null;
  }
  if (message.type === 'button') return message.button?.text ?? null;
  return null;
}

type MetaStatus = {
  id?: string;
  status?: string;
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
};

type MetaWebhookValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { profile?: { name?: string } }[];
  messages?: MetaMessage[];
  message_echoes?: MetaMessage[];
  statuses?: MetaStatus[];
};

type StatusEntrega = 'enviada' | 'entregue' | 'lida' | 'falha';

const STATUS_META: Record<string, StatusEntrega> = {
  sent: 'enviada',
  delivered: 'entregue',
  read: 'lida',
  failed: 'falha',
};

/** A Meta pode entregar os eventos fora de ordem; um status nunca regride (falha sempre vence). */
const STATUS_RANK: Record<StatusEntrega, number> = {
  enviada: 1,
  entregue: 2,
  lida: 3,
  falha: 4,
};

function descreverErroMeta(status: MetaStatus): string {
  const err = status.errors?.[0];
  if (!err) return 'Falha na entrega';
  const detalhe = err.error_data?.details || err.message || err.title || 'Falha na entrega';
  if (err.code === 131042) {
    return 'A conta do WhatsApp Business está sem moeda ou forma de pagamento. Configure em business.facebook.com > Faturamento e pagamentos (mensagens automáticas são cobradas pela Meta). (código 131042)';
  }
  return err.code ? `${detalhe} (código ${err.code})` : detalhe;
}

async function processStatus(supabase: SupabaseAdmin, status: MetaStatus) {
  const novo = status.status ? STATUS_META[status.status] : undefined;
  if (!status.id || !novo) return 0;

  const { data: rows } = await supabase
    .from('whatsapp_mensagens')
    .select('id, status_entrega')
    .eq('meta_message_id', status.id);

  let atualizadas = 0;
  for (const row of rows ?? []) {
    const atual = row.status_entrega as StatusEntrega | null;
    if (atual && STATUS_RANK[atual] >= STATUS_RANK[novo]) continue;

    const { error } = await supabase
      .from('whatsapp_mensagens')
      .update({
        status_entrega: novo,
        erro_entrega: novo === 'falha' ? descreverErroMeta(status) : null,
      })
      .eq('id', row.id);

    if (error) {
      console.error('[CRM webhook] Erro ao atualizar status:', error.message);
    } else {
      atualizadas += 1;
    }
  }
  return atualizadas;
}

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
  const botao = respostaDeBotao(message);
  if (botao) return botao;
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
): Promise<{ empresaId: string; conversaId: string; mensagemId: string } | null> {
  if (!message.from || !message.id) return null;

  const from = message.from;
  const waId = toWhatsAppId(from);
  const contactName = value.contacts?.[0]?.profile?.name;
  const conteudo = extractContent(message);
  const tipo = respostaDeBotao(message) ? 'texto' : mapMessageType(message.type ?? 'text');

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
    .eq('empresa_id', config.empresa_id)
    .maybeSingle();

  if (existing) return null;

  const salva = await appendMensagem(supabase, {
    conversa_id: conversa.id,
    empresa_id: config.empresa_id,
    direcao: options?.isEcho ? 'saida' : 'entrada',
    tipo,
    conteudo,
    meta_message_id: message.id,
    status_entrega: options?.isEcho ? 'enviada' : 'entregue',
  });

  return { empresaId: config.empresa_id, conversaId: conversa.id, mensagemId: salva.id };
}

/** Um número pode estar ligado a várias empresas: a IA responde no máximo uma vez por mensagem. */
function agendarRespostaIA(
  candidatas: { empresaId: string; conversaId: string; mensagemId: string }[]
) {
  if (candidatas.length === 0) return;
  after(async () => {
    for (const c of candidatas) {
      try {
        const resultado = await responderComIA(c);
        if (resultado !== 'inativo') return;
      } catch (err) {
        console.error('[CRM IA] Erro ao responder:', err);
        return;
      }
    }
  });
}

async function resolveConfigs(
  supabase: SupabaseAdmin,
  phoneNumberId: string | undefined
): Promise<{ empresa_id: string; phone_number_id: string | null; ativo: boolean }[]> {
  if (!phoneNumberId) return [];

  const id = String(phoneNumberId);

  // Várias empresas de teste podem compartilhar o mesmo Phone Number ID da Meta.
  // `.maybeSingle()` quebra nesse caso e o webhook descartava todas as mensagens.
  const { data: matched, error } = await supabase
    .from('whatsapp_empresa_config')
    .select('empresa_id, phone_number_id, ativo')
    .eq('phone_number_id', id)
    .eq('ativo', true);

  if (error) {
    console.warn('[CRM webhook] Erro ao buscar config:', error.message);
  }

  if (matched && matched.length > 0) return matched;

  const { data: configs } = await supabase
    .from('whatsapp_empresa_config')
    .select('empresa_id, phone_number_id, ativo')
    .eq('ativo', true);

  if (configs?.length === 1) {
    console.warn(
      `[CRM webhook] phone_number_id ${id} não encontrado; usando única config ativa (${configs[0].phone_number_id})`
    );
    return configs;
  }

  console.warn(`[CRM webhook] Nenhuma config ativa para phone_number_id ${id}`);
  return [];
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

      for (const status of value.statuses ?? []) {
        try {
          processed += await processStatus(supabase, status);
        } catch (err) {
          console.error('[CRM webhook] Erro ao processar status:', err);
        }
      }

      const configs = await resolveConfigs(supabase, value.metadata?.phone_number_id);
      if (configs.length === 0) continue;

      const inbound = value.messages ?? [];
      const echoes = value.message_echoes ?? [];

      const candidatasIA = new Map<string, { empresaId: string; conversaId: string; mensagemId: string }[]>();

      for (const config of configs) {
        for (const message of inbound) {
          try {
            const salva = await processInboundMessage(supabase, config, value, message);
            processed += 1;
            if (salva && message.id && (message.type === 'text' || respostaDeBotao(message))) {
              const lista = candidatasIA.get(message.id) ?? [];
              lista.push(salva);
              candidatasIA.set(message.id, lista);
            }
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

      for (const candidatas of candidatasIA.values()) {
        agendarRespostaIA(candidatas);
      }
    }
  }

  return { processed, skipped: false };
}
