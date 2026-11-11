import https from 'https';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unsealPfx, onlyDigitsDoc } from '../crypto/certificado';
import { pfxToPem } from '../crypto/pfxPem';
import { assinarXmlNfe } from './assinarXml';

export type CancelarNfeResult =
  | { ok: true; message: string; codigo?: string }
  | { ok: false; message: string; codigo?: string };

const PRAZO_HORAS_SP = 24;

function escapeXml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dhEventoBr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  // America/Sao_Paulo aproximado via toLocaleString offset fixo -03:00
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}-03:00`;
}

function urlRecepcaoEvento(mod: '55' | '65', tpAmb: number): string {
  if (mod === '65') {
    return tpAmb === 1
      ? 'https://nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx'
      : 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx';
  }
  return tpAmb === 1
    ? 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx'
    : 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx';
}

function extractEventoProt(xml: string): { cStat?: string; xMotivo?: string; nProt?: string } {
  const cStats = [...xml.matchAll(/<cStat>(\d+)<\/cStat>/g)].map((m) => m[1]);
  const motivos = [...xml.matchAll(/<xMotivo>([^<]*)<\/xMotivo>/g)].map((m) => m[1]);
  // Preferir cStat do retEvento (não o do lote 128)
  const cStat =
    cStats.find((c) => c === '135' || c === '155' || c === '573' || c === '501') ||
    cStats.find((c) => c !== '128' && c !== '104') ||
    cStats[cStats.length - 1];
  const xMotivo =
    (cStat && motivos[cStats.lastIndexOf(cStat)]) || motivos[motivos.length - 1];
  const nProt = xml.match(/<nProt>([^<]*)<\/nProt>/)?.[1];
  return { cStat, xMotivo, nProt };
}

function postSoap(url: string, soap: string, keyPem: string, certPem: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(soap, 'utf8'),
          SOAPAction:
            '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"',
        },
        key: keyPem,
        cert: certPem,
        rejectUnauthorized: false,
        timeout: 25_000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => resolve(data));
      }
    );
    req.on('socket', (socket) => {
      socket.setTimeout(12_000);
      socket.on('timeout', () => {
        req.destroy();
        reject(new Error('SEFAZ não respondeu a tempo no cancelamento.'));
      });
    });
    req.setTimeout(25_000, () => {
      req.destroy();
      reject(new Error('Timeout ao cancelar na SEFAZ.'));
    });
    req.on('error', reject);
    req.write(soap);
    req.end();
  });
}

/**
 * Cancela NF-e (55) ou NFC-e (65) via evento 110111 na SEFAZ-SP.
 * Exige justificativa ≥ 15 caracteres e protocolo de autorização.
 * Prazo usual em SP: 24h após a autorização (a SEFAZ valida).
 */
export async function cancelarNfeOuNfce(
  admin: SupabaseClient,
  empresaId: string,
  opts: {
    tipo: 'nfe' | 'nfce';
    id: string;
    xJust: string;
  }
): Promise<CancelarNfeResult> {
  const xJust = String(opts.xJust || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (xJust.length < 15) {
    return {
      ok: false,
      message: 'A justificativa do cancelamento deve ter no mínimo 15 caracteres (exigência SEFAZ).',
    };
  }
  if (xJust.length > 255) {
    return { ok: false, message: 'Justificativa muito longa (máx. 255 caracteres).' };
  }

  const table = opts.tipo === 'nfe' ? 'fiscal_nfe' : 'fiscal_nfce';
  const { data: nota, error } = await admin
    .from(table)
    .select('id, chave_acesso, protocolo, status, tipo_ambiente, dh_recbto, dh_emi, xml_prot')
    .eq('empresa_id', empresaId)
    .eq('id', opts.id)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!nota) return { ok: false, message: `${opts.tipo === 'nfe' ? 'NF-e' : 'NFC-e'} não encontrada.` };
  if (nota.status === 'cancelada') {
    return { ok: false, message: 'Esta nota já está cancelada.' };
  }
  if (nota.status !== 'autorizada') {
    return { ok: false, message: `Só é possível cancelar nota autorizada (status: ${nota.status}).` };
  }

  const chave = String(nota.chave_acesso || '').replace(/\D/g, '');
  if (chave.length !== 44) {
    return { ok: false, message: 'Chave de acesso inválida na nota.' };
  }

  let nProt = String(nota.protocolo || '').replace(/\D/g, '');
  if (!nProt && nota.xml_prot) {
    nProt = String(nota.xml_prot).match(/<nProt>([^<]*)<\/nProt>/)?.[1] || '';
  }
  if (!nProt) {
    return {
      ok: false,
      message: 'Protocolo de autorização ausente. Não é possível cancelar sem o nProt da SEFAZ.',
    };
  }

  const dhRef = nota.dh_recbto || nota.dh_emi;
  if (dhRef) {
    const horas = (Date.now() - new Date(dhRef).getTime()) / 3_600_000;
    if (horas > PRAZO_HORAS_SP) {
      // Ainda tenta — a SEFAZ pode rejeitar; avisa no retorno se rejeitar
      console.warn('[cancelar] fora do prazo usual de 24h', { horas, chave });
    }
  }

  const { data: config, error: cfgErr } = await admin
    .from('fiscal_empresa_config')
    .select('cnpj, ambiente, uf')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (cfgErr) return { ok: false, message: cfgErr.message };
  if (!config) return { ok: false, message: 'Configure os dados fiscais antes.' };

  const { data: cert, error: certErr } = await admin
    .from('fiscal_certificados')
    .select('pfx_ciphertext, password_ciphertext')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .maybeSingle();
  if (certErr) return { ok: false, message: certErr.message };
  if (!cert) return { ok: false, message: 'Envie o certificado A1.' };

  const { pfx, password } = unsealPfx(cert.pfx_ciphertext, cert.password_ciphertext);
  const { key: keyPem, cert: certPem } = pfxToPem(pfx, password);

  const tpAmb = Number(nota.tipo_ambiente) === 1 || config.ambiente === 'producao' ? 1 : 2;
  const mod = (chave.substring(20, 22) === '65' ? '65' : '55') as '55' | '65';
  const cOrgao = chave.substring(0, 2); // UF do emitente
  const cnpj = onlyDigitsDoc(config.cnpj);
  const nSeqEvento = 1;
  const tpEvento = '110111';
  const idEvento = `ID${tpEvento}${chave}${String(nSeqEvento).padStart(2, '0')}`;
  const idLote = String(Date.now()).slice(-15);

  const eventoXml =
    `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
    `<idLote>${idLote}</idLote>` +
    `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
    `<infEvento Id="${idEvento}">` +
    `<cOrgao>${cOrgao}</cOrgao>` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<CNPJ>${cnpj}</CNPJ>` +
    `<chNFe>${chave}</chNFe>` +
    `<dhEvento>${dhEventoBr()}</dhEvento>` +
    `<tpEvento>${tpEvento}</tpEvento>` +
    `<nSeqEvento>${nSeqEvento}</nSeqEvento>` +
    `<verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00">` +
    `<descEvento>Cancelamento</descEvento>` +
    `<nProt>${nProt}</nProt>` +
    `<xJust>${escapeXml(xJust)}</xJust>` +
    `</detEvento>` +
    `</infEvento>` +
    `</evento>` +
    `</envEvento>`;

  let xmlAssinado: string;
  try {
    xmlAssinado = assinarXmlNfe(eventoXml, keyPem, certPem, 'infEvento');
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Falha ao assinar evento de cancelamento',
    };
  }

  // SOAP: enviar o envEvento assinado dentro de nfeDadosMsg
  const envMatch = xmlAssinado.match(/<envEvento\b[\s\S]*<\/envEvento>/);
  const envBody = envMatch?.[0] || xmlAssinado;
  const soap =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
    `xmlns:soap="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap:Body>` +
    `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">${envBody}</nfeDadosMsg>` +
    `</soap:Body></soap:Envelope>`;

  let resposta: string;
  try {
    resposta = await postSoap(urlRecepcaoEvento(mod, tpAmb), soap, keyPem, certPem);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erro de comunicação com a SEFAZ' };
  }

  const prot = extractEventoProt(resposta);
  const okStat = prot.cStat === '135' || prot.cStat === '155';
  if (!okStat) {
    console.error('[cancelar] rejeitado', {
      cStat: prot.cStat,
      xMotivo: prot.xMotivo,
      chave,
      snippet: resposta.slice(0, 1200),
    });
    return {
      ok: false,
      codigo: prot.cStat,
      message:
        prot.xMotivo ||
        `SEFAZ rejeitou o cancelamento (cStat ${prot.cStat || '?'}). Verifique o prazo de 24h e a justificativa.`,
    };
  }

  await admin
    .from(table)
    .update({
      status: 'cancelada',
      // guarda protocolo do evento no xml_prot (append) se útil — mantém original
    })
    .eq('id', nota.id);

  const label = opts.tipo === 'nfe' ? 'NF-e' : 'NFC-e';
  const prazoMsg =
    prot.cStat === '155'
      ? ' Evento registrado fora do prazo usual; confirme na SEFAZ se a nota ficou cancelada.'
      : '';
  return {
    ok: true,
    codigo: prot.cStat,
    message: `${label} cancelada com sucesso.${prazoMsg}`,
  };
}
