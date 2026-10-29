export type OsChatLeitura = {
  usuario_id: string;
  os_id: string;
  last_read_at: string;
};

/** Primeiro horário em que outro usuário leu a mensagem (estilo WhatsApp "visto às"). */
export function getVistoEm(
  messageCreatedAt: string,
  leituras: OsChatLeitura[],
  meuId: string | null | undefined
): string | null {
  if (!meuId) return null;
  const created = new Date(messageCreatedAt).getTime();
  if (!Number.isFinite(created)) return null;

  let earliest: number | null = null;
  for (const l of leituras) {
    if (l.usuario_id === meuId) continue;
    const t = new Date(l.last_read_at).getTime();
    if (!Number.isFinite(t) || t < created) continue;
    if (earliest === null || t < earliest) earliest = t;
  }
  return earliest == null ? null : new Date(earliest).toISOString();
}

export function formatVistoAs(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const hoje = new Date();
    const sameDay = d.toDateString() === hoje.toDateString();
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `visto às ${hora}`;
    const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `visto em ${data} às ${hora}`;
  } catch {
    return null;
  }
}

export function countUnreadForOs(params: {
  osId: string;
  meuId: string;
  lastReadAt: string | null | undefined;
  messages: Array<{ os_id: string; autor_id: string; created_at: string }>;
}): number {
  const since = params.lastReadAt ? new Date(params.lastReadAt).getTime() : 0;
  let n = 0;
  for (const m of params.messages) {
    if (m.os_id !== params.osId) continue;
    if (m.autor_id === params.meuId) continue;
    if (new Date(m.created_at).getTime() > since) n += 1;
  }
  return n;
}
