import https from 'https';

export type EnviarLoteOpts = {
  xmlAssinado: string;
  /** URL completa do webservice de autorização */
  url: string;
  keyPem: string;
  certPem: string;
  /** Timeout total da requisição (ms). Default 25s. */
  timeoutMs?: number;
  /** Timeout de conexão/socket inicial (ms). Default 12s. */
  connectTimeoutMs?: number;
  soapAction?: string;
};

/**
 * Envia lote sincronizado à SEFAZ com mTLS e timeouts curtos (evita 504 longo no Vercel).
 */
export function enviarLoteSefaz(opts: EnviarLoteOpts): Promise<string> {
  const nfeMatch = opts.xmlAssinado.match(/<NFe\b[\s\S]*<\/NFe>/);
  if (!nfeMatch) throw new Error('XML assinado sem elemento NFe');

  let nfeXml = nfeMatch[0];
  if (!/\sxmlns=/.test(nfeXml.slice(0, 120))) {
    nfeXml = nfeXml.replace('<NFe', '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"');
  }

  const idLote = String(Date.now()).slice(-15);
  const envi =
    `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
    `<idLote>${idLote}</idLote><indSinc>1</indSinc>${nfeXml}</enviNFe>`;

  const soap =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
    `xmlns:soap="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap:Body>` +
    `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">${envi}</nfeDadosMsg>` +
    `</soap:Body></soap:Envelope>`;

  const timeoutMs = opts.timeoutMs ?? 25_000;
  const connectTimeoutMs = opts.connectTimeoutMs ?? 12_000;
  const soapAction =
    opts.soapAction ||
    'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote';

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const ok = (data: string) => {
      if (settled) return;
      settled = true;
      resolve(data);
    };

    const req = https.request(
      opts.url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(soap, 'utf8'),
          SOAPAction: `"${soapAction}"`,
        },
        key: opts.keyPem,
        cert: opts.certPem,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => ok(data));
      }
    );

    req.on('socket', (socket) => {
      socket.setTimeout(connectTimeoutMs);
      socket.on('timeout', () => {
        req.destroy();
        fail(
          new Error(
            'SEFAZ não respondeu a tempo (conexão). Tente novamente em alguns segundos.'
          )
        );
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      fail(new Error('Timeout ao enviar a nota à SEFAZ. Tente novamente.'));
    });
    req.on('error', (e) => fail(e instanceof Error ? e : new Error(String(e))));
    req.write(soap);
    req.end();
  });
}

export function urlAutorizacaoNfeSp(tpAmb: number): string {
  return tpAmb === 1
    ? 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx'
    : 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx';
}

export function urlAutorizacaoNfceSp(tpAmb: number): string {
  return tpAmb === 1
    ? 'https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx'
    : 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx';
}
