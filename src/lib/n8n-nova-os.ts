/**
 * Integração N8N para notificação de nova OS
 * 
 * Envia dados da OS para o webhook do N8N quando uma nova OS é criada.
 * O N8N processa e envia a mensagem no WhatsApp do técnico.
 */

export interface NovaOSPayload {
  os_id: string;
  numero_os: number;
  status: string;
  cliente_nome: string;
  cliente_telefone: string;
  aparelho: string;
  modelo: string;
  defeito: string;
  servico: string;
  tecnico_nome: string;
  tecnico_whatsapp: string;
  link_os: string;
}

/**
 * Envia notificação de nova OS para o N8N
 * @param payload - Dados da OS para envio
 * @returns Promise<boolean> - true se enviado com sucesso
 */
export async function notificarNovaOSN8N(payload: NovaOSPayload): Promise<boolean> {
  const webhookUrl = process.env.N8N_WEBHOOK_NOVA_OS_URL || 'https://gestaoconsert.app.n8n.cloud/webhook/consertos/nova-os';
  
  try {
    console.log('📱 N8N: Payload enviado para webhook:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ N8N: Erro ao enviar notificação:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        payload: payload
      });
      return false;
    }

    const responseData = await response.text();
    console.log('✅ N8N: Notificação enviada com sucesso. Response:', responseData);
    return true;
    
  } catch (error) {
    console.error('❌ N8N: Erro na chamada do webhook:', error);
    console.error('❌ N8N: Payload que falhou:', payload);
    return false;
  }
}

/**
 * Gera URL completa da OS
 * @param osId - ID da OS
 * @returns string - URL completa da OS
 */
export function gerarURLOs(osId: string | number): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gestaoconsert.com.br';
  return `${baseUrl}/ordens/${osId}`;
}

/**
 * Formata número de WhatsApp para o padrão esperado (5512...)
 * @param numero - Número de telefone
 * @returns string - Número formatado
 */
export function formatarWhatsApp(numero: string): string {
  if (!numero) return '';
  
  // Remove todos os caracteres não numéricos
  const cleanNumber = numero.replace(/\D/g, '');
  
  // Se já começa com 55, retorna como está
  if (cleanNumber.startsWith('55')) {
    return cleanNumber;
  }
  
  // Se não começa com 55, adiciona
  return `55${cleanNumber}`;
}

