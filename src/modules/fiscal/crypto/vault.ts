import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getMasterKey(): Buffer {
  const raw = process.env.FISCAL_CERT_ENCRYPTION_KEY;
  if (!raw || raw.trim().length < 16) {
    throw new Error(
      'FISCAL_CERT_ENCRYPTION_KEY ausente ou curta demais (mín. 16 chars). Defina no .env.local.'
    );
  }
  // Deriva 32 bytes estáveis a partir da secret (aceita hex de 64 ou passphrase)
  if (/^[0-9a-fA-F]{64}$/.test(raw.trim())) {
    return Buffer.from(raw.trim(), 'hex');
  }
  return createHash('sha256').update(raw, 'utf8').digest();
}

/** Empacota iv(12) + tag(16) + ciphertext em base64. */
export function encryptSecret(plaintext: Buffer | string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(payloadB64: string): Buffer {
  const key = getMasterKey();
  const buf = Buffer.from(payloadB64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Payload criptografado inválido');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function decryptSecretUtf8(payloadB64: string): string {
  return decryptSecret(payloadB64).toString('utf8');
}

export function hasVaultKeyConfigured(): boolean {
  const raw = process.env.FISCAL_CERT_ENCRYPTION_KEY;
  return Boolean(raw && raw.trim().length >= 16);
}
