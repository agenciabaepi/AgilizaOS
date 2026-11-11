import { createHash } from 'node:crypto';
import forge from 'node-forge';
import {
  parsePfx as openNfseParsePfx,
  InvalidCertificatePasswordError,
  ExpiredCertificateError,
} from 'open-nfse';
import { decryptSecret, decryptSecretUtf8, encryptSecret } from './vault';

export type ParsedA1Meta = {
  subjectCn: string | null;
  cnpj: string | null;
  notBefore: Date;
  notAfter: Date;
  fingerprintSha256: string;
};

function extractCnpjFromText(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const m = digits.match(/\d{14}/);
  return m ? m[0] : null;
}

function extractCnpjFromSubject(attrs: forge.pki.CertificateField[]): string | null {
  for (const a of attrs) {
    const name = String(a.name || a.type || '');
    const value = String(a.value || '');
    if (name === '2.16.76.1.3.3' || name.includes('2.16.76.1.3.3')) {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 14) return digits;
    }
    if (name === 'CN' || name === 'commonName') {
      const cnpj = extractCnpjFromText(value);
      if (cnpj) return cnpj;
    }
  }
  return null;
}

function fingerprintFromPem(certPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  return createHash('sha256')
    .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), 'binary')
    .digest('hex');
}

function passwordCandidates(password: string): string[] {
  const out: string[] = [];
  const push = (p: string) => {
    if (!out.includes(p)) out.push(p);
  };
  push(password);
  push(password.trim());
  // Alguns emissores geram PFX com senha vazia
  push('');
  return out;
}

function tryForgePkcs12(pfx: Buffer, password: string): forge.pkcs12.Pkcs12Pfx {
  const asn1 = forge.asn1.fromDer(pfx.toString('binary'));
  const attempts: Array<() => forge.pkcs12.Pkcs12Pfx> = [
    () => forge.pkcs12.pkcs12FromAsn1(asn1, password),
    () => forge.pkcs12.pkcs12FromAsn1(asn1, false, password),
    () => forge.pkcs12.pkcs12FromAsn1(asn1, true, password),
  ];
  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function metaFromForgeCert(cert: forge.pki.Certificate): ParsedA1Meta {
  const fingerprintSha256 = createHash('sha256')
    .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), 'binary')
    .digest('hex');
  const cnAttr = cert.subject.getField('CN');
  const subjectCn = cnAttr ? String(cnAttr.value) : null;
  return {
    subjectCn,
    cnpj: extractCnpjFromSubject(cert.subject.attributes),
    notBefore: cert.validity.notBefore,
    notAfter: cert.validity.notAfter,
    fingerprintSha256,
  };
}

/**
 * Valida e extrai metadados do A1.
 * Usa o mesmo parser do open-nfse (caminho da emissão) e cai para forge com
 * variações de senha/strict quando necessário.
 */
export function parsePfxMeta(pfx: Buffer, password: string): ParsedA1Meta {
  if (!pfx?.length) {
    throw new Error('Arquivo do certificado está vazio.');
  }

  let lastMessage = '';

  for (const pwd of passwordCandidates(password)) {
    try {
      const parsed = openNfseParsePfx(pfx, pwd);
      return {
        subjectCn: parsed.subject || null,
        cnpj: extractCnpjFromText(parsed.subject),
        notBefore: parsed.issuedOn,
        notAfter: parsed.expiresOn,
        fingerprintSha256: fingerprintFromPem(parsed.certPem),
      };
    } catch (e) {
      if (e instanceof ExpiredCertificateError) {
        throw new Error('Certificado A1 expirado. Emita/renove o A1 e envie novamente.');
      }
      if (e instanceof InvalidCertificatePasswordError) {
        lastMessage = 'senha';
        // tenta próximo candidato
      } else {
        lastMessage = e instanceof Error ? e.message : String(e);
      }
    }

    try {
      const p12 = tryForgePkcs12(pfx, pwd);
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
      if (!certBags?.length || !certBags[0].cert) {
        throw new Error('Certificado A1 sem certificado X.509 no PFX');
      }
      const keyBags =
        p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
          forge.pki.oids.pkcs8ShroudedKeyBag
        ] || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
      if (!keyBags?.length) {
        throw new Error('Certificado A1 sem chave privada no PFX');
      }
      return metaFromForgeCert(certBags[0].cert);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/mac|password|integrity|Invalid password/i.test(msg)) {
        lastMessage = 'senha';
        continue;
      }
      lastMessage = msg;
    }
  }

  if (lastMessage === 'senha' || /mac|password|integrity/i.test(lastMessage)) {
    throw new Error(
      'Senha do certificado incorreta (ou PFX protegido de forma incompatível). Confira a senha definida na emissão do A1 — sem espaços extras.'
    );
  }

  throw new Error(
    lastMessage
      ? `Não foi possível ler o PFX: ${lastMessage}`
      : 'Não foi possível ler o certificado A1.'
  );
}

export function sealPfx(
  pfx: Buffer,
  password: string
): {
  pfxCiphertext: string;
  passwordCiphertext: string;
  meta: ParsedA1Meta;
} {
  const pwd = password.trim();
  const meta = parsePfxMeta(pfx, pwd);
  if (meta.notAfter.getTime() <= Date.now()) {
    throw new Error('Certificado A1 expirado');
  }
  // Guarda a senha que abriu o PFX (trimada) — mesma usada na emissão
  const workingPassword = (() => {
    for (const candidate of passwordCandidates(password)) {
      try {
        openNfseParsePfx(pfx, candidate);
        return candidate;
      } catch {
        try {
          tryForgePkcs12(pfx, candidate);
          return candidate;
        } catch {
          /* next */
        }
      }
    }
    return pwd;
  })();

  return {
    pfxCiphertext: encryptSecret(pfx),
    passwordCiphertext: encryptSecret(workingPassword),
    meta,
  };
}

export function unsealPfx(
  pfxCiphertext: string,
  passwordCiphertext: string
): {
  pfx: Buffer;
  password: string;
} {
  return {
    pfx: decryptSecret(pfxCiphertext),
    password: decryptSecretUtf8(passwordCiphertext),
  };
}

export function onlyDigitsDoc(doc: string): string {
  return doc.replace(/\D/g, '');
}
