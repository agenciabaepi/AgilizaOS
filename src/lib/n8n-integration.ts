/**
 * Integração com N8N para automação WhatsApp
 * Sistema de Gestão Consert
 */

interface N8nOSPayload {
  os_id: string;
  status: string;
  empresa_id: string;
  tecnico_nome: string;
  tecnico_whatsapp: string;
  equipamento: string;
  valor: string;
  link_os: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  servico?: string;
  numero_os?: number;
}

interface N8nNovaOSPayload {
  os_id: string;
  empresa_id: string;
  tecnico_nome: string;
  tecnico_whatsapp: string;
  cliente_nome: string;
  cliente_telefone: string;
  equipamento: string;
  servico: string;
  numero_os: number;
  status: string;
  link_os: string;
  valor?: string;
}

/**
 * Notifica N8N quando uma OS é aprovada
 */
export async function notificarN8nOSAprovada(payload: N8nOSPayload): Promise<boolean> {
  try {
    const url = process.env.N8N_WEBHOOK_URL!;
    
    if (!url) {
      console.error('❌ N8N: URL do webhook não configurada');
      return false;
    }

    console.log('📡 N8N: Enviando notificação de OS aprovada:', {
      os_id: payload.os_id,
      status: payload.status,
      tecnico: payload.tecnico_nome
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Falha ao notificar n8n: ${res.status} - ${txt}`);
    }

    const result = await res.json();
    console.log('✅ N8N: Notificação de OS aprovada enviada com sucesso:', result);
    
    return true;
  } catch (error) {
    console.error('❌ N8N: Erro ao notificar OS aprovada:', error);
    return false;
  }
}

/**
 * Notifica N8N quando uma nova OS é criada
 */
export async function notificarN8nNovaOS(payload: N8nNovaOSPayload): Promise<boolean> {
  try {
    const url = process.env.N8N_WEBHOOK_NOVA_OS_URL || process.env.N8N_WEBHOOK_URL!;
    
    if (!url) {
      console.error('❌ N8N: URL do webhook não configurada');
      return false;
    }

    console.log('📡 N8N: Enviando notificação de nova OS:', {
      os_id: payload.os_id,
      numero_os: payload.numero_os,
      tecnico: payload.tecnico_nome,
      cliente: payload.cliente_nome
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Falha ao notificar n8n: ${res.status} - ${txt}`);
    }

    const result = await res.json();
    console.log('✅ N8N: Notificação de nova OS enviada com sucesso:', result);
    
    return true;
  } catch (error) {
    console.error('❌ N8N: Erro ao notificar nova OS:', error);
    return false;
  }
}

/**
 * Notifica N8N quando status de OS muda para qualquer status específico
 */
export async function notificarN8nStatusOS(payload: N8nOSPayload): Promise<boolean> {
  try {
    const url = process.env.N8N_WEBHOOK_STATUS_URL || process.env.N8N_WEBHOOK_URL!;
    
    if (!url) {
      console.error('❌ N8N: URL do webhook não configurada');
      return false;
    }

    console.log('📡 N8N: Enviando notificação de mudança de status:', {
      os_id: payload.os_id,
      status: payload.status,
      tecnico: payload.tecnico_nome
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Falha ao notificar n8n: ${res.status} - ${txt}`);
    }

    const result = await res.json();
    console.log('✅ N8N: Notificação de status enviada com sucesso:', result);
    
    return true;
  } catch (error) {
    console.error('❌ N8N: Erro ao notificar mudança de status:', error);
    return false;
  }
}

/**
 * Função utilitária para formatar valores monetários
 */
export function formatarValor(valor: number | string): string {
  const numValor = typeof valor === 'string' ? parseFloat(valor) : valor;
  
  if (isNaN(numValor)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValor);
}

/**
 * Função utilitária para gerar link da OS
 */
export function gerarLinkOS(osId: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://gestaoconsert.com.br';
  return `${base}/ordens/${osId}`;
}

/**
 * Função utilitária para formatar número de WhatsApp
 */
export function formatarWhatsApp(numero: string): string {
  // Remove todos os caracteres não numéricos
  const numeroLimpo = numero.replace(/\D/g, '');
  
  // Se não começar com 55 (Brasil), adiciona
  if (!numeroLimpo.startsWith('55')) {
    return `55${numeroLimpo}`;
  }
  
  return numeroLimpo;
}

