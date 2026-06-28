/** Normalização de telefone para WhatsApp Cloud API (formato E.164 sem +) */

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function toWhatsAppId(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function phonesMatch(a: string, b: string): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  const stripCountry = (n: string) => (n.startsWith('55') ? n.slice(2) : n);
  return da === db || stripCountry(da) === stripCountry(db);
}
