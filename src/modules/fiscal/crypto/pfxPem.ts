import forge from 'node-forge';
import { parsePfx as openNfseParsePfx } from 'open-nfse';

export type PfxPem = { key: string; cert: string };

function passwordCandidates(password: string): string[] {
  const out: string[] = [];
  const push = (p: string) => {
    if (!out.includes(p)) out.push(p);
  };
  push(password);
  push(password.trim());
  push('');
  return out;
}

function forgePfxToPem(pfx: Buffer, password: string): PfxPem {
  const asn1 = forge.asn1.fromDer(pfx.toString('binary'));
  let p12: forge.pkcs12.Pkcs12Pfx | null = null;
  let lastErr: unknown;
  for (const attempt of [
    () => forge.pkcs12.pkcs12FromAsn1(asn1, password),
    () => forge.pkcs12.pkcs12FromAsn1(asn1, false, password),
    () => forge.pkcs12.pkcs12FromAsn1(asn1, true, password),
  ]) {
    try {
      p12 = attempt();
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!p12) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
  const cert = certBags?.[0]?.cert;
  if (!cert) throw new Error('PFX sem certificado X.509');

  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
  const key = keyBags?.[0]?.key;
  if (!key) throw new Error('PFX sem chave privada');

  return {
    key: forge.pki.privateKeyToPem(key),
    cert: forge.pki.certificateToPem(cert),
  };
}

/** Extrai chave/cert PEM do A1 (mesmo caminho rápido da NFS-e — sem openssl/pem). */
export function pfxToPem(pfx: Buffer, password: string): PfxPem {
  let lastMsg = '';
  for (const pwd of passwordCandidates(password)) {
    try {
      const parsed = openNfseParsePfx(pfx, pwd);
      if (parsed.keyPem && parsed.certPem) {
        return { key: parsed.keyPem, cert: parsed.certPem };
      }
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : String(e);
    }
    try {
      return forgePfxToPem(pfx, pwd);
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(
    /senha|password|mac|integrity/i.test(lastMsg)
      ? 'Senha do certificado A1 incorreta.'
      : `Não foi possível ler o certificado A1: ${lastMsg || 'erro desconhecido'}`
  );
}
