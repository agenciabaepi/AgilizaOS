import type { WhatsAppAtendimentoIa, WhatsAppConversa, WhatsAppIaResumo } from './types';

/** "Assumir conversa" pausa a IA sem prazo: só volta quando alguém devolve manualmente. */
export const IA_PAUSA_MANUAL_ATE = '2999-12-31T00:00:00.000Z';

/** Quem está atendendo a conversa agora; null quando o assistente está desligado na empresa. */
export function atendimentoIa(
  conversa: Pick<WhatsAppConversa, 'ia_pausada_ate' | 'ia_pausa_motivo' | 'atribuido_usuario_id'>,
  ia: WhatsAppIaResumo | null | undefined,
  agora = Date.now()
): WhatsAppAtendimentoIa | null {
  if (!ia?.ativo) return null;
  const pausada = !!conversa.ia_pausada_ate && new Date(conversa.ia_pausada_ate).getTime() > agora;
  if (pausada) return conversa.ia_pausa_motivo === 'transferencia' ? 'aguardando' : 'atendente';
  if (ia.modo_resposta === 'sem_atendente' && conversa.atribuido_usuario_id) return 'atendente';
  return 'ia';
}

export function iaPausadaSemPrazo(conversa: Pick<WhatsAppConversa, 'ia_pausada_ate'>): boolean {
  return !!conversa.ia_pausada_ate && new Date(conversa.ia_pausada_ate).getFullYear() >= 2999;
}
