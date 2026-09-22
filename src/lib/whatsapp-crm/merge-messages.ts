import type { WhatsAppMensagem } from './types';

/**
 * Servidor manda; local só contribui com pending-* ainda sem confirmação.
 * Não reinsere mensagens antigas do cache (isso “voltava no tempo”).
 */
export function mergeWhatsAppMensagens(
  server: WhatsAppMensagem[],
  local: WhatsAppMensagem[] = []
): WhatsAppMensagem[] {
  const byId = new Map<string, WhatsAppMensagem>();

  for (const m of server) {
    byId.set(m.id, m);
  }

  for (const m of local) {
    if (!m.id.startsWith('pending-')) continue;

    const duplicata = server.some(
      (s) =>
        s.direcao === m.direcao &&
        s.conteudo === m.conteudo &&
        Math.abs(new Date(s.created_at).getTime() - new Date(m.created_at).getTime()) < 120_000
    );
    if (!duplicata) byId.set(m.id, m);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}
