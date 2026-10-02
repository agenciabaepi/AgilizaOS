import type { WhatsAppEmpresaConfig } from './types';
import { isWhatsAppSistemaPhoneNumber } from '@/lib/whatsapp-sistema/phone';

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

/** CRM só envia com a credencial da empresa. O número do sistema fica nas env e não serve de fallback. */
function resolveCredentials(config?: Pick<WhatsAppEmpresaConfig, 'phone_number_id' | 'access_token'> | null) {
  const phoneNumberId = config?.phone_number_id?.trim() || '';
  const accessToken = config?.access_token?.trim() || '';
  if (!phoneNumberId || !accessToken || isWhatsAppSistemaPhoneNumber(phoneNumberId)) {
    return { phoneNumberId: '', accessToken: '' };
  }
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

export interface SendButtonsMessageParams extends SendTextMessageParams {
  /** Até 3 botões de resposta rápida; título com no máximo 20 caracteres */
  buttons: { id: string; title: string }[];
}

/** Envia texto com botões de resposta rápida (só dentro da janela de 24h) */
export async function sendWhatsAppButtonsMessage(
  params: SendButtonsMessageParams
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
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: params.message.slice(0, 1024) },
          action: {
            buttons: params.buttons.slice(0, 3).map((b) => ({
              type: 'reply',
              reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
            })),
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      const errCode = data?.error?.code ? ` (#${data.error.code})` : '';
      return { success: false, error: humanizeWhatsAppError(`${errMsg}${errCode}`) };
    }

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao enviar mensagem',
    };
  }
}

export interface SendTemplateMessageParams {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams?: string[];
  /** Sufixo da URL dinâmica de um botão (índice do botão no template) */
  urlButtons?: { index: number; param: string }[];
  /** Documento do cabeçalho, para templates com header do tipo DOCUMENT */
  headerDocument?: { mediaId: string; filename: string };
  config?: Pick<WhatsAppEmpresaConfig, 'phone_number_id' | 'access_token'> | null;
}

/** Meta rejeita parâmetros vazios, com quebra de linha/tab ou com mais de 4 espaços seguidos */
function sanitizeTemplateParam(value: string): string {
  const clean = value.replace(/[\n\r\t]+/g, ' ').replace(/ {4,}/g, '   ').trim();
  return clean || '-';
}

/** Envia mensagem de template aprovado via WhatsApp Cloud API (permite iniciar conversa) */
export async function sendWhatsAppTemplateMessage(
  params: SendTemplateMessageParams
): Promise<SendTextMessageResult> {
  const { phoneNumberId, accessToken } = resolveCredentials(params.config);

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: humanizeWhatsAppError('Credenciais WhatsApp não configuradas') };
  }

  const to = params.to.replace(/\D/g, '');
  const phoneWithCountry = to.startsWith('55') ? to : `55${to}`;

  const components: Record<string, unknown>[] = [];
  if (params.headerDocument) {
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: { id: params.headerDocument.mediaId, filename: params.headerDocument.filename },
        },
      ],
    });
  }
  if (params.bodyParams?.length) {
    components.push({
      type: 'body',
      parameters: params.bodyParams.map((text) => ({ type: 'text', text: sanitizeTemplateParam(text) })),
    });
  }
  for (const button of params.urlButtons ?? []) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: String(button.index),
      parameters: [{ type: 'text', text: button.param }],
    });
  }

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
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.languageCode },
          ...(components.length ? { components } : {}),
        },
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
      error: err instanceof Error ? err.message : 'Erro ao enviar template',
    };
  }
}

/** Sobe um arquivo para a Meta e devolve o media id (válido por 30 dias) */
export async function uploadWhatsAppMedia(params: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  config?: Pick<WhatsAppEmpresaConfig, 'phone_number_id' | 'access_token'> | null;
}): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const { phoneNumberId, accessToken } = resolveCredentials(params.config);
  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'Credenciais WhatsApp não configuradas' };
  }

  try {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', params.mimeType);
    form.append(
      'file',
      new Blob([new Uint8Array(params.buffer)], { type: params.mimeType }),
      params.filename
    );

    const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    const data = await response.json();
    if (!response.ok || !data?.id) {
      return { success: false, error: data?.error?.message || `HTTP ${response.status}` };
    }
    return { success: true, mediaId: data.id as string };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar arquivo' };
  }
}

/** Envia documento já enviado à Meta (só dentro da janela de 24h) */
export async function sendWhatsAppDocumentMessage(params: {
  to: string;
  mediaId: string;
  filename: string;
  caption?: string;
  config?: Pick<WhatsAppEmpresaConfig, 'phone_number_id' | 'access_token'> | null;
}): Promise<SendTextMessageResult> {
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
        type: 'document',
        document: {
          id: params.mediaId,
          filename: params.filename,
          ...(params.caption ? { caption: params.caption.slice(0, 1024) } : {}),
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      const errCode = data?.error?.code ? ` (#${data.error.code})` : '';
      return { success: false, error: humanizeWhatsAppError(`${errMsg}${errCode}`) };
    }
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar documento' };
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
