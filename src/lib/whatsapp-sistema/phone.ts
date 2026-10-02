/** Phone Number ID do WhatsApp da plataforma (env), distinto dos números do CRM. */
export function whatsappSistemaPhoneNumberId(): string | null {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return id || null;
}

export function isWhatsAppSistemaPhoneNumber(phoneNumberId: string | null | undefined): boolean {
  const sistema = whatsappSistemaPhoneNumberId();
  if (!sistema || !phoneNumberId) return false;
  return String(phoneNumberId) === sistema;
}
