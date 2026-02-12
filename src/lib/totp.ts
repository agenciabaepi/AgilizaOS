import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodifica string Base32 (RFC 3548) para Buffer.
 */
function base32Decode(str: string): Buffer {
  const clean = str.replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Codifica Buffer para Base32 (RFC 3548).
 */
function base32Encode(buf: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | (buf[i] & 0xff);
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return result;
}

/**
 * Gera código TOTP para um timestamp (período 30s, 6 dígitos). RFC 6238.
 */
function totpAt(secretBytes: Buffer, counter: number): string {
  const timeBuffer = Buffer.allocUnsafe(8);
  timeBuffer.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = createHmac('sha1', secretBytes);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  const offset = hash[19]! & 0x0f;
  const code =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);
  const otp = code % 1_000_000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifica se o token TOTP é válido para o secret (com janela de ±window períodos de 30s).
 */
export function verifyTOTP(secretBase32: string, token: string, window = 1): boolean {
  const secretBytes = base32Decode(secretBase32);
  if (secretBytes.length === 0) return false;
  const period = 30;
  const timeSeconds = Math.floor(Date.now() / 1000);
  const counter = Math.floor(timeSeconds / period);
  for (let step = -window; step <= window; step++) {
    const code = totpAt(secretBytes, counter + step);
    if (code === token) return true;
  }
  return false;
}

/**
 * Gera um secret TOTP aleatório (Base32). Compatível com Google Authenticator, Authy, etc.
 */
export function generateTOTPSecret(): string {
  const bytes = randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Gera URI otpauth para escanear no app autenticador.
 */
export function generateTOTPURI(options: {
  secret: string;
  issuer?: string;
  label?: string;
}): string {
  const { secret, issuer = 'Admin SaaS', label = 'Admin' } = options;
  const params = new URLSearchParams();
  params.set('secret', secret);
  if (issuer) params.set('issuer', issuer);
  const encodedLabel = label ? encodeURIComponent(label) : 'Admin';
  return `otpauth://totp/${encodedLabel}?${params.toString()}`;
}
