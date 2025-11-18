import { createAdminClient } from './supabaseClient';

interface ComissaoResumo {
  id: string;
  numero_os: number;
  cliente_nome: string;
  valor_comissao: number;
  data_entrega: string;
  status: string;
}

/**
 * Busca técnico pelo número de WhatsApp
 */
export async function getTecnicoByWhatsApp(whatsappNumber: string): Promise<{ id: string; nome: string; whatsapp: string } | null> {
  try {
    const supabase = createAdminClient();
    
    // Normalizar número (remover caracteres especiais)
    const normalizedNumber = whatsappNumber.replace(/\D/g, '');
    
    // Buscar todos os técnicos e filtrar localmente (mais flexível)
    const { data: tecnicos, error } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp')
      .eq('nivel', 'tecnico');

    if (error) {
      console.error('❌ Erro ao buscar técnicos:', error);
      return null;
    }

    if (!tecnicos || tecnicos.length === 0) {
      return null;
    }

    // Buscar técnico cujo WhatsApp corresponde (com diferentes formatos)
    const tecnico = tecnicos.find(t => {
      if (!t.whatsapp) return false;
      
      const techWhatsapp = t.whatsapp.replace(/\D/g, '');
      const normalized = normalizedNumber;
      
      // Comparar diferentes formatos
      return techWhatsapp === normalized ||
             techWhatsapp === normalized.replace(/^55/, '') ||
             techWhatsapp === `55${normalized}` ||
             `55${techWhatsapp}` === normalized ||
             techWhatsapp.replace(/^55/, '') === normalized.replace(/^55/, '');
    });

    return tecnico || null;
  } catch (error) {
    console.error('❌ Erro interno ao buscar técnico por WhatsApp:', error);
    return null;
  }
}

/**
 * Busca comissões do técnico
 */
export async function getComissoesTecnico(tecnicoId: string, limit: number = 10): Promise<{
  comissoes: ComissaoResumo[];
  total: number;
  totalPago: number;
  totalPendente: number;
}> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('comissoes_historico')
      .select(`
        id,
        ordem_servico_id,
        valor_comissao,
        data_entrega,
        status,
        ordens_servico:ordem_servico_id (
          numero_os
        ),
        clientes:cliente_id (
          nome
        )
      `)
      .eq('tecnico_id', tecnicoId)
      .order('data_entrega', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao buscar comissões:', error);
      return {
        comissoes: [],
        total: 0,
        totalPago: 0,
        totalPendente: 0
      };
    }

    // Calcular total
    const total = (data || []).reduce((acc, c) => acc + (c.valor_comissao || 0), 0);
    const totalPago = (data || []).filter(c => c.status === 'PAGA').reduce((acc, c) => acc + (c.valor_comissao || 0), 0);
    const totalPendente = (data || []).filter(c => c.status !== 'PAGA').reduce((acc, c) => acc + (c.valor_comissao || 0), 0);

    return {
      comissoes: (data || []).map((c: any) => ({
        id: c.id,
        numero_os: c.ordens_servico?.numero_os || 0,
        cliente_nome: c.clientes?.nome || 'N/A',
        valor_comissao: c.valor_comissao || 0,
        data_entrega: c.data_entrega,
        status: c.status || 'CALCULADA'
      })),
      total,
      totalPago,
      totalPendente
    };
  } catch (error) {
    console.error('❌ Erro interno ao buscar comissões:', error);
    return {
      comissoes: [],
      total: 0,
      totalPago: 0,
      totalPendente: 0
    };
  }
}

/**
 * Formata comissões para mensagem WhatsApp
 */
export function formatComissoesMessage(comissoes: ComissaoResumo[], total: number, totalPago: number, totalPendente: number, tecnicoNome: string): string {
  let message = `💰 *Suas Comissões*\n\n`;
  message += `Olá, ${tecnicoNome}!\n\n`;
  
  if (comissoes.length === 0) {
    message += `Você ainda não possui comissões registradas.\n`;
    return message;
  }

  message += `*Resumo:*\n`;
  message += `📊 Total: R$ ${total.toFixed(2).replace('.', ',')}\n`;
  message += `✅ Pagas: R$ ${totalPago.toFixed(2).replace('.', ',')}\n`;
  message += `⏳ Pendentes: R$ ${totalPendente.toFixed(2).replace('.', ',')}\n\n`;
  
  message += `*Últimas ${comissoes.length} comissões:*\n\n`;
  
  comissoes.forEach((comissao, index) => {
    const dataFormatada = new Date(comissao.data_entrega).toLocaleDateString('pt-BR');
    const statusEmoji = comissao.status === 'PAGA' ? '✅' : '⏳';
    const statusTexto = comissao.status === 'PAGA' ? 'Paga' : 'Pendente';
    
    message += `${index + 1}. OS #${comissao.numero_os}\n`;
    message += `   Cliente: ${comissao.cliente_nome}\n`;
    message += `   Valor: R$ ${comissao.valor_comissao.toFixed(2).replace('.', ',')}\n`;
    message += `   Data: ${dataFormatada}\n`;
    message += `   ${statusEmoji} ${statusTexto}\n\n`;
  });

  message += `\nDigite */comissoes* novamente para atualizar.`;

  return message;
}

