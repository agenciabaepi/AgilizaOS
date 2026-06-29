/**
 * CRM WhatsApp (inbox + automações Meta Cloud API).
 *
 * Disponível apenas em beta / desenvolvimento.
 * Produção oficial (gestaoconsert.com.br): não definir NEXT_PUBLIC_WHATSAPP_CRM_ENABLED.
 *
 * Beta (beta.gestaoconsert.com.br): NEXT_PUBLIC_WHATSAPP_CRM_ENABLED=true
 * ou NEXT_PUBLIC_ENVIRONMENT=beta
 */
export const WHATSAPP_CRM_ENABLED =
  process.env.NEXT_PUBLIC_WHATSAPP_CRM_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'beta' ||
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'development';

export function isWhatsAppCrmEnabled(): boolean {
  return WHATSAPP_CRM_ENABLED;
}
