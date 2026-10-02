import { whatsappSistemaPhoneNumberId } from './phone';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function credenciaisSistema(): { phoneNumberId: string; accessToken: string } | null {
  const phoneNumberId = whatsappSistemaPhoneNumberId();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

function destino(to: string): string {
  const digits = to.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

async function postMensagem(body: Record<string, unknown>): Promise<boolean> {
  const cred = credenciaisSistema();
  if (!cred) {
    console.error('WhatsApp do sistema sem WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN');
    return false;
  }

  try {
    const response = await fetch(`${GRAPH_BASE}/${cred.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cred.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        ...body,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      console.error('Falha ao enviar pelo WhatsApp do sistema:', data?.error?.message || response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao enviar pelo WhatsApp do sistema:', err);
    return false;
  }
}

export async function sendSistemaTexto(to: string, message: string): Promise<boolean> {
  return postMensagem({
    to: destino(to),
    type: 'text',
    text: { preview_url: false, body: message },
  });
}

/** Imagem por URL pública (Cloud API, janela de 24h). */
export async function sendSistemaImagem(to: string, link: string, caption?: string): Promise<boolean> {
  return postMensagem({
    to: destino(to),
    type: 'image',
    image: {
      link,
      ...(caption ? { caption: caption.slice(0, 1024) } : {}),
    },
  });
}
