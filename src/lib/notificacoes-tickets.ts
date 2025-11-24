/**
 * Função helper para criar notificações relacionadas a tickets de suporte
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

interface CriarNotificacaoTicketParams {
  empresa_id: string;
  ticket_id: string;
  tipo: 'ticket_resposta' | 'ticket_status' | 'ticket_comentario';
  mensagem: string;
  ticket_titulo?: string;
}

/**
 * Cria uma notificação para a empresa quando o admin interage com um ticket
 */
export async function criarNotificacaoTicket(params: CriarNotificacaoTicketParams) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { empresa_id, ticket_id, tipo, mensagem, ticket_titulo } = params;

    // Criar notificação na tabela notificacoes
    const { data, error } = await supabase
      .from('notificacoes')
      .insert({
        empresa_id,
        tipo,
        mensagem,
        // Usar campo genérico para referenciar o ticket (pode ser os_id ou criar campo ticket_id)
        // Por enquanto, vamos usar um campo JSONB para dados extras ou criar um campo ticket_id
        // Como a tabela pode não ter ticket_id, vamos usar mensagem para incluir o ID do ticket
        lida: false,
        cliente_avisado: false
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar notificação de ticket:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data };
  } catch (error: any) {
    console.error('Erro ao criar notificação de ticket:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Formata mensagem de notificação baseada no tipo e dados do ticket
 */
export function formatarMensagemNotificacao(
  tipo: 'ticket_resposta' | 'ticket_status' | 'ticket_comentario',
  ticketTitulo: string,
  dadosExtras?: {
    status?: string;
    resposta?: string;
    comentario?: string;
  }
): string {
  switch (tipo) {
    case 'ticket_resposta':
      return `📩 Seu ticket "${ticketTitulo}" recebeu uma resposta do suporte.`;
    
    case 'ticket_status':
      const statusLabel = dadosExtras?.status 
        ? dadosExtras.status.charAt(0).toUpperCase() + dadosExtras.status.slice(1).replace('_', ' ')
        : 'atualizado';
      return `🔄 Status do ticket "${ticketTitulo}" foi alterado para: ${statusLabel}.`;
    
    case 'ticket_comentario':
      return `💬 Novo comentário no ticket "${ticketTitulo}".`;
    
    default:
      return `📋 Atualização no ticket "${ticketTitulo}".`;
  }
}

