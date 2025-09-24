/**
 * Integração N8N para notificação de nova OS
 * 
 * Envia dados da OS para o webhook do N8N quando uma nova OS é criada.
 * O N8N processa e envia a mensagem no WhatsApp do técnico.
 */

interface NovaOSPayload {
  tecnico_id?: string; // ✅ Adicionar ID do técnico
  numero_os: number;
  cliente_nome: string;
  equipamento: string;
  defeito: string;
  status: string;
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
  const webhookUrl = 'https://gestaoconsert.app.n8n.cloud/webhook/novo-aparelho';
  
  try {
    console.log('📱 N8N: Enviando notificação de nova OS:', payload);
    
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
        error: errorData
      });
      return false;
    }

    console.log('✅ N8N: Notificação de nova OS enviada com sucesso');
    return true;
    
  } catch (error) {
    console.error('❌ N8N: Erro na chamada do webhook:', error);
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

