import type { WhatsAppMensagem } from './types';

const PENDING_MATCH_WINDOW_MS = 120_000;
/** Tolerância para relógio do navegador adiantado em relação ao banco */
const CLOCK_SKEW_MS = 10_000;

function isPending(m: WhatsAppMensagem) {
  return m.id.startsWith('pending-');
}

function ts(m: WhatsAppMensagem) {
  return new Date(m.created_at).getTime();
}

function confirmaPending(real: WhatsAppMensagem, pending: WhatsAppMensagem) {
  const diff = ts(real) - ts(pending);
  return (
    real.direcao === pending.direcao &&
    real.conteudo === pending.conteudo &&
    diff >= -CLOCK_SKEW_MS &&
    diff < PENDING_MATCH_WINDOW_MS
  );
}

function ordenar(lista: WhatsAppMensagem[]) {
  return lista.sort((a, b) => ts(a) - ts(b));
}

/**
 * Insere ou atualiza mensagens por id (realtime, confirmação de envio).
 * Uma pending-* some quando a mensagem real equivalente já está na lista.
 */
export function upsertWhatsAppMensagens(
  atual: WhatsAppMensagem[],
  novas: WhatsAppMensagem[]
): WhatsAppMensagem[] {
  const byId = new Map(atual.map((m) => [m.id, m]));
  for (const m of novas) {
    byId.set(m.id, { ...byId.get(m.id), ...m });
  }

  const todas = Array.from(byId.values());
  const reais = todas.filter((m) => !isPending(m));
  return ordenar(
    todas.filter((m) => !isPending(m) || !reais.some((r) => confirmaPending(r, m)))
  );
}

/**
 * Snapshot do servidor manda. Do estado local só entram pending-* e mensagens
 * mais novas que o snapshot (chegaram pelo realtime enquanto o fetch estava em voo).
 */
export function mergeWhatsAppMensagens(
  server: WhatsAppMensagem[],
  local: WhatsAppMensagem[] = []
): WhatsAppMensagem[] {
  const serverIds = new Set(server.map((m) => m.id));
  const maisNovaServidor = server.reduce((max, m) => Math.max(max, ts(m)), 0);
  const extras = local.filter(
    (m) => !serverIds.has(m.id) && (isPending(m) || ts(m) > maisNovaServidor)
  );
  return upsertWhatsAppMensagens(server, extras);
}
