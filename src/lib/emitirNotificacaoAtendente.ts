import type { SupabaseClient } from '@supabase/supabase-js';

export type TipoNotificacaoAtendente = 'orcamento_enviado' | 'reparo_concluido';

function normalizeStatusKey(status: string): string {
  return status
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

export function tipoNotificacaoPorStatusTecnico(
  statusAnterior: string,
  statusNovo: string
): TipoNotificacaoAtendente | null {
  const ant = normalizeStatusKey(statusAnterior);
  const novo = normalizeStatusKey(statusNovo);
  if (ant === novo) return null;

  if (novo.includes('ORCAMENTO') && novo.includes('CONCLUIDO')) {
    return 'orcamento_enviado';
  }
  if (novo.includes('REPARO') && novo.includes('CONCLUIDO')) {
    return 'reparo_concluido';
  }
  return null;
}

export async function emitirNotificacaoAtendente(
  supabase: SupabaseClient,
  params: {
    empresa_id: string;
    os_id: string;
    tipo: TipoNotificacaoAtendente;
    mensagem: string;
  }
): Promise<boolean> {
  const { error } = await supabase.from('notificacoes').insert({
    empresa_id: params.empresa_id,
    tipo: params.tipo,
    os_id: params.os_id,
    mensagem: params.mensagem,
    lida: false,
    cliente_avisado: false,
  });

  if (error) {
    console.warn('[emitirNotificacaoAtendente] Falha ao inserir notificação:', error.message);
    return false;
  }
  return true;
}
