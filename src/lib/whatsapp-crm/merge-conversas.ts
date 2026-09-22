import type { WhatsAppConversa, WhatsAppMensagem } from './types';

function ts(iso: string | null | undefined) {
  if (!iso) return 0;
  return new Date(iso).getTime();
}

/**
 * Evita que um fetch atrasado ou um UPDATE realtime antigo
 * sobrescreva preview/hora mais novos já no estado local.
 */
export function mergeWhatsAppConversa(
  local: WhatsAppConversa | undefined,
  incoming: WhatsAppConversa
): WhatsAppConversa {
  if (!local) return incoming;

  const localNewer = ts(local.ultima_mensagem_em) > ts(incoming.ultima_mensagem_em);

  const base: WhatsAppConversa = localNewer
    ? {
        ...incoming,
        ...local,
        ultima_mensagem_preview: local.ultima_mensagem_preview,
        ultima_mensagem_em: local.ultima_mensagem_em,
      }
    : {
        ...local,
        ...incoming,
      };

  return {
    ...base,
    clientes: incoming.clientes ?? local.clientes ?? null,
    usuarios: incoming.usuarios ?? local.usuarios ?? null,
    ordens_servico: incoming.ordens_servico ?? local.ordens_servico ?? null,
  };
}

export function mergeWhatsAppConversasList(
  local: WhatsAppConversa[],
  incoming: WhatsAppConversa[]
): WhatsAppConversa[] {
  const byId = new Map(local.map((c) => [c.id, c]));
  return incoming.map((c) => mergeWhatsAppConversa(byId.get(c.id), c));
}

/** Atualiza preview da lista a partir da última mensagem conhecida. */
export function previewFromMensagem(msg: WhatsAppMensagem): Pick<
  WhatsAppConversa,
  'ultima_mensagem_preview' | 'ultima_mensagem_em'
> {
  return {
    ultima_mensagem_preview: msg.conteudo.slice(0, 120),
    ultima_mensagem_em: msg.created_at,
  };
}
