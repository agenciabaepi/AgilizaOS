export interface EnvioWhatsAppMetaInput {
  phoneNumber?: string;
  to?: string;
  message?: string;
  useTemplate?: boolean;
  templateName?: string;
  templateParams?: {
    header?: Array<Record<string, any>>;
    body?: Array<{ type: string; text?: string; [k: string]: any }>;
  };
}

export interface EnvioWhatsAppMetaResultado {
  status: number;
  body: Record<string, any>;
}

/** A Meta rejeita parâmetros de template com quebra de linha, tab ou 4+ espaços seguidos (erro 132018). */
function sanitizarParametroTemplate(texto: string): string {
  return texto
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {4,}/g, '   ')
    .trim();
}

export async function enviarMensagemWhatsAppMeta(
  input: EnvioWhatsAppMetaInput
): Promise<EnvioWhatsAppMetaResultado> {
  const { phoneNumber, to, message, useTemplate, templateName, templateParams } = input;
  const phone = to || phoneNumber;

  if (!phone || !message) {
    return { status: 400, body: { error: 'Número de telefone e mensagem são obrigatórios' } };
  }

  const formattedPhone = String(phone).replace(/\D/g, '');
  const phoneWithCountryCode = formattedPhone.startsWith('55') ? formattedPhone : `55${formattedPhone}`;

  const shouldUseTemplate = useTemplate !== false;
  const template = templateName || process.env.WHATSAPP_TEMPLATE_NAME || 'os_nova_v5';

  let whatsappMessage: Record<string, any>;

  if (shouldUseTemplate && template) {
    const components: any[] = [];

    if (templateParams?.header && templateParams.header.length > 0) {
      components.push({ type: 'header', parameters: templateParams.header });
    }

    const bodyParams = (templateParams?.body || [{ type: 'text', text: message }]).map((p) =>
      p.type === 'text' && typeof p.text === 'string' ? { ...p, text: sanitizarParametroTemplate(p.text) } : p
    );

    if (bodyParams.length > 0) {
      components.push({ type: 'body', parameters: bodyParams });
    }

    whatsappMessage = {
      messaging_product: 'whatsapp',
      to: phoneWithCountryCode,
      type: 'template',
      template: { name: template, language: { code: 'pt_BR' }, components },
    };
  } else {
    whatsappMessage = {
      messaging_product: 'whatsapp',
      to: phoneWithCountryCode,
      type: 'text',
      text: { body: message },
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    console.error('❌ WHATSAPP_PHONE_NUMBER_ID não está configurado!');
    return {
      status: 500,
      body: { error: 'WHATSAPP_PHONE_NUMBER_ID não está configurado nas variáveis de ambiente' },
    };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappMessage),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', responseData);
      const errorCode = responseData?.error?.code;
      const errorSubcode = responseData?.error?.error_subcode;
      return {
        status: response.status,
        body: {
          error: 'Erro ao enviar mensagem WhatsApp',
          details: responseData,
          suggestion:
            errorCode === 100 && errorSubcode === 33
              ? 'Verifique se o WHATSAPP_PHONE_NUMBER_ID está correto e se o token tem permissões'
              : undefined,
        },
      };
    }

    const contact = responseData.contacts?.[0];
    const messageId = responseData.messages?.[0]?.id;

    return {
      status: 200,
      body: {
        success: true,
        messageId,
        data: responseData,
        contact,
        warning: !contact?.wa_id
          ? 'O número pode não estar cadastrado no WhatsApp ou não estar na janela de 24 horas. Verifique se o número iniciou uma conversa nas últimas 24h.'
          : undefined,
        formattedPhone: phoneWithCountryCode,
      },
    };
  } catch (error) {
    console.error('❌ Erro interno ao enviar mensagem WhatsApp:', error);
    return { status: 500, body: { error: 'Erro interno do servidor' } };
  }
}
