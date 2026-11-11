import { SignedXml } from 'xml-crypto';

/**
 * Assina o XML da NF-e/NFC-e (tag infNFe) com o mesmo algoritmo do node-sped-nfe,
 * sem depender de openssl/pem (lento/travado no Vercel).
 */
export function assinarXmlNfe(xml: string, keyPem: string, certPem: string): string {
  const certBody = certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\r?\n|\r/g, '');

  const sig = new SignedXml({
    privateKey: keyPem,
    publicCert: certPem,
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    getKeyInfoContent: () =>
      `<X509Data><X509Certificate>${certBody}</X509Certificate></X509Data>`,
  });

  sig.addReference({
    xpath: `//*[local-name(.)='infNFe']`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
  });

  sig.computeSignature(xml, {
    location: {
      reference: `//*[local-name()='infNFe']`,
      action: 'after',
    },
  });

  return sig.getSignedXml();
}
