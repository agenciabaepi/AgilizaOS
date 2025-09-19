import { createAdminClient } from './supabaseClient';

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
    let { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, email')
      .eq('id', tecnicoId)
      .eq('nivel', 'tecnico')
      .single();

    // Se o técnico específico não existir, buscar qualquer técnico
    if (error && error.code === 'PGRST116') {
      console.log(`Técnico ID ${tecnicoId} não encontrado, buscando qualquer técnico...`);
      const { data: fallbackTecnico, error: fallbackError } = await supabase
        .from('usuarios')
        .select('id, nome, whatsapp, email')
        .eq('nivel', 'tecnico')
        .limit(1)
        .single();
      
      if (!fallbackError && fallbackTecnico) {
        data = fallbackTecnico;
        error = null;
        console.log(`✅ Usando técnico fallback: ${fallbackTecnico.nome}`);
      }
    }

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

    // Enviar mensagem via WhatsApp Cloud API
           const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/whatsapp/send-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tecnicoData.whatsapp,
        message: message
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao enviar mensagem WhatsApp:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Notificação WhatsApp enviada com sucesso:', {
      tecnico: tecnicoData.nome,
      telefone: tecnicoData.whatsapp,
      os: osData.numero_os,
      messageId: result.messageId
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

    // Enviar mensagem via WhatsApp Cloud API
    console.log('📱 DEBUG: Enviando mensagem WhatsApp para nova OS:', {
      whatsapp: tecnicoData.whatsapp,
      mensagem: message.substring(0, 100) + '...',
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/whatsapp/send-message`
    });
    
           const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/whatsapp/send-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tecnicoData.whatsapp,
        message: message
      }),
    });

    console.log('📱 DEBUG: Resposta do fetch:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao enviar mensagem WhatsApp:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Notificação WhatsApp de nova OS enviada com sucesso:', {
      tecnico: tecnicoData.nome,
      whatsapp: tecnicoData.whatsapp,
      os: osData.numero_os,
      cliente: clienteNome,
      messageId: result.messageId,
      result: result
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

    // Enviar mensagem via WhatsApp Cloud API
    console.log('📱 DEBUG: Enviando mensagem WhatsApp:', {
      telefone: tecnicoData.whatsapp,
      mensagem: message.substring(0, 100) + '...',
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/whatsapp/send-message`
    });
    
           const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/whatsapp/send-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tecnicoData.whatsapp,
        message: message
      }),
    });

    console.log('📱 DEBUG: Resposta do fetch:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao enviar mensagem WhatsApp:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Notificação WhatsApp enviada com sucesso:', {
      tecnico: tecnicoData.nome,
      telefone: tecnicoData.whatsapp,
      os: osData.numero_os,
      status: newStatus,
      messageId: result.messageId,
      result: result
    });

    return true;

  } catch (error) {
    console.error('❌ Erro ao enviar notificação WhatsApp:', error);
    return false;
  }
}
