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
  empresa_id?: string;
  equipamento?: string;
  marca?: string;
  modelo?: string;
  problema_relatado?: string;
  valor?: number;
  clientes?: {
    nome: string;
    telefone: string;
  } | null;
  empresas?: {
    logo_url?: string;
  } | null;
}

/**
 * Envia mensagem WhatsApp como texto livre (sem template)
 * Permite quebras de linha e formatação markdown
 */
async function sendWhatsAppMessageFreeText(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    console.log('📱 Enviando mensagem WhatsApp como texto livre:', {
      to: phoneNumber,
      messageLength: message.length
    });

    // Determinar URL base automaticamente
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      || process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        useTemplate: false // Forçar mensagem de texto livre
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao enviar mensagem WhatsApp:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Mensagem WhatsApp enviada com sucesso:', result);
    return true;

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

/**
 * Envia mensagem diretamente pela API do WhatsApp (sem N8N)
 * Suporta tanto mensagens de texto quanto templates
 */
async function sendWhatsAppMessage(
  phoneNumber: string, 
  message: string, 
  templateParams?: { 
    tecnicoNome?: string; 
    numeroOS?: number; 
    status?: string; 
    clienteNome?: string; 
    clienteTelefone?: string; 
    aparelho?: string; 
    modelo?: string; 
    defeito?: string;
    logoUrl?: string;
  }
): Promise<boolean> {
  try {
    console.log('📱 Enviando mensagem WhatsApp direta:', {
      to: phoneNumber,
      messageLength: message.length,
      hasTemplateParams: !!templateParams
    });

    // Se tiver parâmetros do template, montar o payload do template
    let body: any = {
      to: phoneNumber,
      message: message,
      useTemplate: true,
      templateName: 'os_nova_v5'
    };

    if (templateParams) {
      // Montar parâmetros do template os_nova_v5
      // Header: Imagem do logo (OBRIGATÓRIO para o template os_nova_v5)
      // Se não tiver logo da empresa, usar uma imagem padrão ou deixar vazio (pode dar erro)
      const headerParams = templateParams.logoUrl ? [
        {
          type: 'image',
          image: {
            link: templateParams.logoUrl
          }
        }
      ] : [
        // Se não tiver logo, tentar usar uma imagem padrão
        // Ou deixar vazio se o template permitir
        {
          type: 'image',
          image: {
            link: 'https://via.placeholder.com/200x200?text=Logo' // Placeholder temporário
          }
        }
      ];

      // Body: Parâmetros do template
      // Ordem dos parâmetros baseada no template:
      // 1. Nome do técnico
      // 2. Número da OS
      // 3. Status
      // 4. Cliente
      // 5. Contato
      // 6. Aparelho
      // 7. Modelo
      // 8. Defeito
      body.templateParams = {
        header: headerParams,
        body: [
          { type: 'text', text: templateParams.tecnicoNome || 'Técnico' },
          { type: 'text', text: String(templateParams.numeroOS || '') },
          { type: 'text', text: templateParams.status || '' },
          { type: 'text', text: templateParams.clienteNome || 'Cliente' },
          { type: 'text', text: templateParams.clienteTelefone || '' },
          { type: 'text', text: templateParams.aparelho || '' },
          { type: 'text', text: templateParams.modelo || '' },
          { type: 'text', text: templateParams.defeito || '' }
        ]
      };
    }

    // Determinar URL base automaticamente (funciona em dev, preview e prod)
    // Em produção no Vercel, usar a URL do domínio ou VERCEL_URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      || process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      || 'http://localhost:3000';

    console.log('🌐 Base URL usada para chamada interna:', baseUrl);

    const response = await fetch(`${baseUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao enviar mensagem WhatsApp:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Mensagem WhatsApp enviada com sucesso:', result);
    return true;

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
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
        equipamento,
        marca,
        modelo,
        problema_relatado,
        empresa_id,
        clientes!inner(nome, telefone),
        empresas(logo_url)
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

    // Criar mensagem simples de aprovação (sem template, sem imagem)
    const clienteNome = osData.clientes?.nome || 'Cliente não informado';
    const servico = osData.servico || 'Serviço não especificado';
    
    // Mensagem simples e direta sobre a aprovação
    const message = `🎉 *OS APROVADA!*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clienteNome}
🔧 *Serviço:* ${servico}
✅ *Status:* Aprovado

A OS foi aprovada pelo cliente e está pronta para execução!

_Consert - Sistema de Gestão_`;

    console.log('📱 Enviando notificação de OS aprovada (mensagem simples):', {
      os_id: osData.id,
      numero_os: osData.numero_os,
      tecnico: tecnicoData.nome,
      whatsapp: tecnicoData.whatsapp
    });

    // Enviar como mensagem de texto livre (sem template, sem imagem)
    // Funciona dentro da janela de 24h
    const success = await sendWhatsAppMessageFreeText(tecnicoData.whatsapp, message);

    if (!success) {
      console.error('❌ Falha ao enviar notificação de OS aprovada');
      return false;
    }

    console.log('✅ Notificação de OS aprovada enviada com sucesso:', {
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

    // Preparar dados para o template os_nova_v5
    const clienteNome = (osData.clientes as any)?.nome || 'Cliente não informado';
    const clienteTelefone = (osData.clientes as any)?.telefone || '';
    const aparelho = osData.equipamento || '';
    const modelo = osData.modelo || '';
    const defeito = osData.problema_relatado || '';
    const status = osData.status || 'ORÇAMENTO';
    const logoUrl = (osData.empresas as any)?.logo_url || null;

    // Mensagem de fallback (caso o template não funcione)
    const message = `🆕 *NOVA ORDEM DE SERVIÇO!*

📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clienteNome}
📞 *Telefone:* ${clienteTelefone || 'Não informado'}
🔧 *Serviço:* ${osData.servico || 'Serviço não especificado'}
📅 *Status:* ${status}

Uma nova ordem de serviço foi criada e está aguardando sua análise!

_Consert - Sistema de Gestão_`;

    // Enviar mensagem usando template os_nova_v5
    console.log('📱 Enviando notificação de nova OS usando template os_nova_v5:', {
      os_id: osData.id,
      numero_os: osData.numero_os,
      tecnico: tecnicoData.nome,
      whatsapp: tecnicoData.whatsapp,
      cliente: clienteNome,
      template: 'os_nova_v5',
      hasLogo: !!logoUrl
    });

    const success = await sendWhatsAppMessage(tecnicoData.whatsapp, message, {
      tecnicoNome: tecnicoData.nome,
      numeroOS: osData.numero_os,
      status: status,
      clienteNome: clienteNome,
      clienteTelefone: clienteTelefone.replace(/\D/g, ''), // Remove caracteres não numéricos
      aparelho: aparelho,
      modelo: modelo,
      defeito: defeito,
      logoUrl: logoUrl
    });

    if (!success) {
      console.error('❌ Falha ao enviar notificação de nova OS');
      return false;
    }

    console.log('✅ Notificação de nova OS enviada com sucesso:', {
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

    // Enviar mensagem diretamente pelo WhatsApp (sem N8N)
    console.log('📱 Enviando notificação de mudança de status diretamente:', {
      os_id: osData.id,
      status: newStatus,
      tecnico: tecnicoData.nome,
      whatsapp: tecnicoData.whatsapp
    });

    const success = await sendWhatsAppMessage(tecnicoData.whatsapp, message);

    if (!success) {
      console.error('❌ Falha ao enviar notificação de status');
      return false;
    }

    console.log('✅ Notificação de status enviada com sucesso:', {
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
