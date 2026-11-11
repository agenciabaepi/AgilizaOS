import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encryptSecret, decryptSecret, decryptSecretUtf8 } from '../crypto/vault';

describe('fiscal vault AES-GCM', () => {
  const prev = process.env.FISCAL_CERT_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.FISCAL_CERT_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterAll(() => {
    if (prev === undefined) delete process.env.FISCAL_CERT_ENCRYPTION_KEY;
    else process.env.FISCAL_CERT_ENCRYPTION_KEY = prev;
  });

  it('round-trips utf8 secrets', () => {
    const sealed = encryptSecret('senha-do-pfx');
    expect(decryptSecretUtf8(sealed)).toBe('senha-do-pfx');
  });

  it('round-trips binary buffers', () => {
    const buf = Buffer.from([1, 2, 3, 250, 0, 9]);
    const sealed = encryptSecret(buf);
    expect(decryptSecret(sealed).equals(buf)).toBe(true);
  });

  it('fails on tampered ciphertext', () => {
    const sealed = Buffer.from(encryptSecret('x'), 'base64');
    sealed[sealed.length - 1] ^= 0xff;
    expect(() => decryptSecret(sealed.toString('base64'))).toThrow();
  });
});
