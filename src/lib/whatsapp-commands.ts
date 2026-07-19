import { createAdminClient } from './supabaseClient';
import { filterUsuariosTecnicos, TECNICOS_OR_FILTER } from '@/lib/tecnicos';

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
      .select('id, nome, whatsapp, nivel, tambem_tecnico')
      .or(TECNICOS_OR_FILTER);

    if (error) {
      console.error('❌ Erro ao buscar técnicos:', error);
      return null;
    }

    if (!tecnicos || tecnicos.length === 0) {
      return null;
    }

    const tecnicosValidos = filterUsuariosTecnicos(tecnicos);

    // Buscar técnico cujo WhatsApp corresponde (com diferentes formatos)
    const tecnico = tecnicosValidos.find(t => {
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

/**
 * Busca senha do aparelho de uma OS pelo número
 * ⚠️ SEGURANÇA: Apenas técnicos podem buscar senhas, e apenas de OS que pertencem a eles
 */
export async function getSenhaOSPorNumero(
  numeroOS: string | number, 
  empresaId: string,
  tecnicoAuthUserId: string | null = null
): Promise<{
  numero_os: string;
  senha_aparelho: string | null;
  senha_padrao: string | null;
  cliente_nome: string;
  equipamento: string;
} | null> {
  try {
    const supabase = createAdminClient();
    
    // Buscar OS pelo número e empresa
    let query = supabase
      .from('ordens_servico')
      .select(`
        numero_os,
        senha_aparelho,
        senha_padrao,
        equipamento,
        empresa_id,
        tecnico_id,
        cliente:cliente_id (
          nome
        )
      `)
      .eq('numero_os', String(numeroOS))
      .eq('empresa_id', empresaId);

    // 🔒 SEGURANÇA CRÍTICA: Se tecnicoAuthUserId foi fornecido, verificar se a OS pertence a ele
    if (tecnicoAuthUserId) {
      query = query.eq('tecnico_id', tecnicoAuthUserId);
    }

    const { data: os, error } = await query.single();

    if (error || !os) {
      console.error('❌ Erro ao buscar OS:', error);
      return null;
    }

    // 🔒 VERIFICAÇÃO ADICIONAL: Se tecnicoAuthUserId foi fornecido, garantir que a OS pertence ao técnico
    if (tecnicoAuthUserId && os.tecnico_id !== tecnicoAuthUserId) {
      console.error('🚫 Acesso negado: OS não pertence ao técnico', {
        numeroOS,
        tecnicoAuthUserId,
        osTecnicoId: os.tecnico_id
      });
      return null;
    }

    return {
      numero_os: String(os.numero_os),
      senha_aparelho: os.senha_aparelho || null,
      senha_padrao: os.senha_padrao || null,
      cliente_nome: (os.cliente as any)?.nome || 'N/A',
      equipamento: os.equipamento || 'N/A'
    };
  } catch (error) {
    console.error('❌ Erro interno ao buscar senha da OS:', error);
    return null;
  }
}

/**
 * Formata mensagem de senha da OS para WhatsApp
 */
export function formatSenhaOSMessage(dadosOS: {
  numero_os: string;
  senha_aparelho: string | null;
  senha_padrao: string | null;
  cliente_nome: string;
  equipamento: string;
}): string {
  let message = `🔐 *Senha da OS #${dadosOS.numero_os}*\n\n`;
  
  if (dadosOS.senha_aparelho) {
    message += `🔑 *Senha do Aparelho:*\n`;
    message += `\`${dadosOS.senha_aparelho}\`\n\n`;
  } else {
    message += `⚠️ Senha do aparelho não foi informada.\n\n`;
  }
  
  if (dadosOS.senha_padrao) {
    try {
      const padrao = typeof dadosOS.senha_padrao === 'string' 
        ? JSON.parse(dadosOS.senha_padrao) 
        : dadosOS.senha_padrao;
      
      if (Array.isArray(padrao) && padrao.length > 0) {
        message += `📱 *Padrão Android:*\n`;
        message += `${padrao.join(' → ')}\n\n`;
      }
    } catch (e) {
      // Ignorar erro de parsing
    }
  }
  
  message += `📋 Cliente: ${dadosOS.cliente_nome}\n`;
  message += `📱 Equipamento: ${dadosOS.equipamento}\n`;
  
  return message;
}

