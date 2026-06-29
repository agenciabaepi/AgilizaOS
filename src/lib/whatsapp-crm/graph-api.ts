import type { WhatsAppEmpresaConfig } from './types';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface SendTextMessageParams {
  to: string;
  message: string;
  config?: Pick<WhatsAppEmpresaConfig, 'phone_number_id' | 'access_token'> | null;
}

export interface SendTextMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function humanizeWhatsAppError(raw: string): string {
  const lower = raw.toLowerCase();
  if (raw.includes('131047') || lower.includes('re-engagement') || lower.includes('24 hour')) {
    return 'Fora da janela de 24h: o cliente precisa ter enviado mensagem recentemente, ou use um template aprovado na Meta.';
  }
  if (raw.includes('131030') || lower.includes('not in allowed') || lower.includes('recipient')) {
    return 'Número não autorizado. Em modo teste, cadastre o celular na Meta (WhatsApp > API Setup > números de teste).';
  }
  if (raw.includes('190') || lower.includes('expired') || lower.includes('session has expired')) {
    return 'Token expirado. Reconecte o WhatsApp em Configurações.';
  }
  if (lower.includes('not configured') || lower.includes('credenciais')) {
    return raw;
  }
  return raw;
}

function resolveCredentials(config?: Pick<WhatsAppEmpresaConfig, 'phone_number_id' | 'access_token'> | null) {
  const phoneNumberId = config?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = config?.access_token || process.env.WHATSAPP_ACCESS_TOKEN;
  return { phoneNumberId, accessToken };
}

/** Envia mensagem de texto via WhatsApp Cloud API */
export async function sendWhatsAppTextMessage(
  params: SendTextMessageParams
): Promise<SendTextMessageResult> {
  const { phoneNumberId, accessToken } = resolveCredentials(params.config);

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: humanizeWhatsAppError('Credenciais WhatsApp não configuradas') };
  }

  const to = params.to.replace(/\D/g, '');
  const phoneWithCountry = to.startsWith('55') ? to : `55${to}`;

  try {
    const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneWithCountry,
        type: 'text',
        text: { preview_url: false, body: params.message },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      const errCode = data?.error?.code ? ` (#${data.error.code})` : '';
      return { success: false, error: humanizeWhatsAppError(`${errMsg}${errCode}`) };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao enviar mensagem',
    };
  }
}

/** Valida credenciais contra a Graph API */
export async function validateWhatsAppCredentials(
  phoneNumberId: string,
  accessToken: string
): Promise<{ valid: boolean; displayPhone?: string; error?: string }> {
  try {
    const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) {
      return { valid: false, error: data?.error?.message || 'Credenciais inválidas' };
    }
    return { valid: true, displayPhone: data.display_phone_number };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Erro na validação',
    };
  }
}
