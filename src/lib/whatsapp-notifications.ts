import { createAdminClient } from './supabaseClient';
import { 
  notificarN8nOSAprovada, 
  notificarN8nNovaOS, 
  notificarN8nStatusOS,
  formatarValor,
  gerarLinkOS,
  formatarWhatsApp
} from './n8n-integration';

interface TecnicoData {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
}

interface OSData {
  id: string;
  numero_os: number;
  cliente_id: string;
  tecnico_id: string;
  status: string;
  status_tecnico: string;
  servico: string;
  empresa_id?: string;
  equipamento?: string;
  valor?: number;
  clientes?: {
    nome: string;
    telefone: string;
  } | null;
}

/**
 * Busca dados do técnico responsável pela OS
 */
export async function getTecnicoData(tecnicoId: string): Promise<TecnicoData | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, auth_user_id, nome, whatsapp, email')
      .eq('auth_user_id', tecnicoId)  // ✅ Corrigido: usar auth_user_id
      .eq('nivel', 'tecnico')
      .single();

    if (error) {
      console.error('❌ Erro ao buscar dados do técnico:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Erro interno ao buscar técnico:', error);
    return null;
  }
}

/**
 * Busca dados completos da OS incluindo cliente e técnico
 */
export async function getOSData(osId: string): Promise<OSData | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        cliente_id,
        tecnico_id,
        status,
        status_tecnico,
        servico,
        clientes!inner(nome, telefone)
      `)
      .eq('id', osId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar dados da OS:', error);
      return null;
    }

    return data as unknown as OSData;
  } catch (error) {
    console.error('❌ Erro interno ao buscar OS:', error);
    return null;
  }
}

/**
 * Envia notificação WhatsApp para o técnico quando status muda para aprovado
 */
export async function sendOSApprovedNotification(osId: string): Promise<boolean> {
  try {
    // Buscar dados da OS
    const osData = await getOSData(osId);
    if (!osData) {
      console.error('❌ OS não encontrada:', osId);
      return false;
    }

    // Verificar se o status é realmente "aprovado"
    const isApproved = osData.status?.toLowerCase().includes('aprovado') || 
                      osData.status_tecnico?.toLowerCase().includes('aprovado');
    
    if (!isApproved) {
      console.log('ℹ️ OS não está aprovada, não enviando notificação');
      return false;
    }

    // Buscar dados do técnico
    const tecnicoData = await getTecnicoData(osData.tecnico_id);
    if (!tecnicoData) {
      console.error('❌ Técnico não encontrado:', osData.tecnico_id);
      return false;
    }

    // Verificar se o técnico tem telefone
    if (!tecnicoData.whatsapp) {
      console.error('❌ Técnico não possui whatsapp cadastrado:', tecnicoData.nome);
      return false;
    }

    // Criar mensagem personalizada
    const clienteNome = osData.clientes?.nome || 'Cliente não informado';
    const servico = osData.servico || 'Serviço não especificado';
    
    const message = `🎉 *OS APROVADA!*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clienteNome}
🔧 *Serviço:* ${servico}
✅ *Status:* Aprovado

A OS foi aprovada pelo cliente e está pronta para execução!

_Consert - Sistema de Gestão_`;

    // Enviar notificação via N8N
    console.log('📡 N8N: Enviando notificação de OS aprovada via N8N:', {
      os_id: osData.id,
      numero_os: osData.numero_os,
      tecnico: tecnicoData.nome
    });

    const n8nPayload = {
      os_id: osData.id,
      status: 'APROVADO',
      empresa_id: osData.empresa_id || '', // Assumindo que empresa_id está disponível
      tecnico_nome: tecnicoData.nome,
      tecnico_whatsapp: formatarWhatsApp(tecnicoData.whatsapp),
      equipamento: osData.equipamento || 'Não especificado',
      valor: formatarValor(osData.valor || 0),
      link_os: gerarLinkOS(osData.id),
      cliente_nome: clienteNome,
      cliente_telefone: osData.clientes?.telefone || 'Não informado',
      servico: servico,
      numero_os: osData.numero_os
    };

    const n8nSuccess = await notificarN8nOSAprovada(n8nPayload);

    if (!n8nSuccess) {
      console.error('❌ N8N: Falha ao enviar notificação de OS aprovada via N8N');
      return false;
    }

    console.log('✅ Notificação de OS aprovada enviada com sucesso via N8N:', {
      tecnico: tecnicoData.nome,
      telefone: tecnicoData.whatsapp,
      os: osData.numero_os
    });

    return true;

  } catch (error) {
    console.error('❌ Erro ao enviar notificação WhatsApp:', error);
    return false;
  }
}

/**
 * Envia notificação WhatsApp para o técnico quando uma nova OS é criada
 */
export async function sendNewOSNotification(osId: string): Promise<boolean> {
  try {
    console.log('🔍 DEBUG: sendNewOSNotification iniciada:', { osId });
    
    // Buscar dados da OS
    const osData = await getOSData(osId);
    if (!osData) {
      console.error('❌ OS não encontrada:', osId);
      return false;
    }
    
    console.log('✅ DEBUG: Nova OS encontrada:', {
      id: osData.id,
      numero_os: osData.numero_os,
      tecnico_id: osData.tecnico_id,
      cliente_nome: osData.clientes?.nome,
      cliente_telefone: osData.clientes?.telefone
    });

    // Buscar dados do técnico
    console.log('🔍 DEBUG: Buscando dados do técnico:', osData.tecnico_id);
    const tecnicoData = await getTecnicoData(osData.tecnico_id);
    if (!tecnicoData) {
      console.error('❌ Técnico não encontrado:', osData.tecnico_id);
      return false;
    }
    
    console.log('✅ DEBUG: Técnico encontrado:', {
      id: tecnicoData.id,
      nome: tecnicoData.nome,
      whatsapp: tecnicoData.whatsapp,
      email: tecnicoData.email
    });

    // Verificar se o técnico tem whatsapp
    if (!tecnicoData.whatsapp) {
      console.error('❌ Técnico não possui whatsapp cadastrado:', tecnicoData.nome);
      return false;
    }

    // Criar mensagem para nova OS
    const clienteNome = (osData.clientes as any)?.nome || 'Cliente não informado';
    const servico = osData.servico || 'Serviço não especificado';
    
    const message = `🆕 *NOVA ORDEM DE SERVIÇO!*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clienteNome}
📞 *Telefone:* ${(osData.clientes as any)?.telefone || 'Não informado'}
🔧 *Serviço:* ${servico}
📅 *Status:* ${osData.status}

Uma nova ordem de serviço foi criada e está aguardando sua análise!

_Consert - Sistema de Gestão_`;

    // Enviar notificação via N8N
    console.log('📡 N8N: Enviando notificação de nova OS via N8N:', {
      os_id: osData.id,
      numero_os: osData.numero_os,
      tecnico: tecnicoData.nome,
      cliente: clienteNome
    });

    const n8nPayload = {
      os_id: osData.id,
      empresa_id: osData.empresa_id || '', // Assumindo que empresa_id está disponível
      tecnico_nome: tecnicoData.nome,
      tecnico_whatsapp: formatarWhatsApp(tecnicoData.whatsapp),
      cliente_nome: clienteNome,
      cliente_telefone: (osData.clientes as any)?.telefone || 'Não informado',
      equipamento: osData.equipamento || 'Não especificado',
      servico: servico,
      numero_os: osData.numero_os,
      status: osData.status,
      link_os: gerarLinkOS(osData.id)
    };

    const n8nSuccess = await notificarN8nNovaOS(n8nPayload);

    if (!n8nSuccess) {
      console.error('❌ N8N: Falha ao enviar notificação de nova OS via N8N');
      return false;
    }

    console.log('✅ Notificação de nova OS enviada com sucesso via N8N:', {
      tecnico: tecnicoData.nome,
      whatsapp: tecnicoData.whatsapp,
      os: osData.numero_os,
      cliente: clienteNome
    });

    return true;

  } catch (error) {
    console.error('❌ Erro ao enviar notificação WhatsApp de nova OS:', error);
    return false;
  }
}

/**
 * Envia notificação WhatsApp para o técnico quando status muda para qualquer status específico
 */
export async function sendOSStatusNotification(osId: string, newStatus: string): Promise<boolean> {
  try {
    console.log('🔍 DEBUG: sendOSStatusNotification iniciada:', { osId, newStatus });
    
    // Verificar se o status é relevante para notificação
    const statusLower = newStatus.toLowerCase();
    const shouldNotify = statusLower.includes('aprovado') || 
                        statusLower.includes('concluido') || 
                        statusLower.includes('concluído') || 
                        statusLower.includes('entregue');
    
    if (!shouldNotify) {
      console.log('ℹ️ Status não requer notificação:', newStatus);
      return false;
    }
    
    // Buscar dados da OS
    const osData = await getOSData(osId);
    if (!osData) {
      console.error('❌ OS não encontrada:', osId);
      return false;
    }
    
    console.log('✅ DEBUG: OS encontrada:', {
      id: osData.id,
      numero_os: osData.numero_os,
      tecnico_id: osData.tecnico_id,
      cliente_nome: osData.clientes?.nome,
      cliente_telefone: osData.clientes?.telefone
    });

    // Buscar dados do técnico
    console.log('🔍 DEBUG: Buscando dados do técnico:', osData.tecnico_id);
    const tecnicoData = await getTecnicoData(osData.tecnico_id);
    if (!tecnicoData) {
      console.error('❌ Técnico não encontrado:', osData.tecnico_id);
      return false;
    }
    
    console.log('✅ DEBUG: Técnico encontrado:', {
      id: tecnicoData.id,
      nome: tecnicoData.nome,
      telefone: tecnicoData.whatsapp,
      email: tecnicoData.email
    });

    // Verificar se o técnico tem telefone
    if (!tecnicoData.whatsapp) {
      console.error('❌ Técnico não possui whatsapp cadastrado:', tecnicoData.nome);
      return false;
    }

    // Definir mensagens baseadas no status
    let message = '';
    const clienteNome = osData.clientes?.nome || 'Cliente não informado';
    const servico = osData.servico || 'Serviço não especificado';

    switch (newStatus.toLowerCase()) {
      case 'aprovado':
        message = `🎉 *OS APROVADA!*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clienteNome}
🔧 *Serviço:* ${servico}
✅ *Status:* Aprovado

A OS foi aprovada pelo cliente e está pronta para execução!

_Consert - Sistema de Gestão_`;
        break;

      case 'concluido':
      case 'concluído':
        message = `✅ *OS CONCLUÍDA!*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clienteNome}
🔧 *Serviço:* ${servico}
✅ *Status:* Concluído

Parabéns! A OS foi concluída com sucesso.

_Consert - Sistema de Gestão_`;
        break;

      case 'entregue':
        message = `📦 *OS ENTREGUE!*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clienteNome}
🔧 *Serviço:* ${servico}
✅ *Status:* Entregue

A OS foi entregue ao cliente com sucesso!

_Consert - Sistema de Gestão_`;
        break;

      default:
        message = `📋 *ATUALIZAÇÃO DE STATUS*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clienteNome}
🔧 *Serviço:* ${servico}
🔄 *Novo Status:* ${newStatus}

O status da OS foi atualizado.

_Consert - Sistema de Gestão_`;
        break;
    }

    // Enviar notificação via N8N
    console.log('📡 N8N: Enviando notificação de mudança de status via N8N:', {
      os_id: osData.id,
      status: newStatus,
      tecnico: tecnicoData.nome
    });

    const n8nPayload = {
      os_id: osData.id,
      status: newStatus,
      empresa_id: osData.empresa_id || '', // Assumindo que empresa_id está disponível
      tecnico_nome: tecnicoData.nome,
      tecnico_whatsapp: formatarWhatsApp(tecnicoData.whatsapp),
      equipamento: osData.equipamento || 'Não especificado',
      valor: formatarValor(osData.valor || 0),
      link_os: gerarLinkOS(osData.id),
      cliente_nome: clienteNome,
      cliente_telefone: osData.clientes?.telefone || 'Não informado',
      servico: servico,
      numero_os: osData.numero_os
    };

    // Usar função específica para OS aprovada
    let n8nSuccess = false;
    if (newStatus.toLowerCase() === 'aprovado') {
      n8nSuccess = await notificarN8nOSAprovada(n8nPayload);
    } else {
      n8nSuccess = await notificarN8nStatusOS(n8nPayload);
    }

    if (!n8nSuccess) {
      console.error('❌ N8N: Falha ao enviar notificação de status via N8N');
      return false;
    }

    console.log('✅ Notificação de status enviada com sucesso via N8N:', {
      tecnico: tecnicoData.nome,
      telefone: tecnicoData.whatsapp,
      os: osData.numero_os,
      status: newStatus
    });

    return true;

  } catch (error) {
    console.error('❌ Erro ao enviar notificação WhatsApp:', error);
    return false;
  }
}
