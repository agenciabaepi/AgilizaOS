import fs from 'fs';
import https from 'https';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import type { SupabaseClient } from '@supabase/supabase-js';
import pem from 'pem';
import { Make, Tools, UF2cUF, cMun2Mun } from 'node-sped-nfe';
import { unsealPfx, onlyDigitsDoc } from '../crypto/certificado';
import type { FiscalEmpresaConfig } from '../types';

export type NfceItem = {
  codigo?: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  ncm?: string;
  cfop?: string;
  unidade?: string;
};

export type EmitirNfceInput = {
  itens: NfceItem[];
  /** Valor pago (pode incluir troco zero) */
  valorPago?: number;
  /** Código tPag SEFAZ: 01 dinheiro, 03 crédito, 04 débito, 17 PIX, 99 outros */
  formaPagamento?: string;
  tomador?: {
    documento?: string;
    nome?: string;
  };
  ordemServicoId?: string;
  vendaId?: string;
  /** Inf. complementar */
  informacoes?: string;
};

export type EmitirNfceResult =
  | {
      ok: true;
      status: 'autorizada';
      nfceId: string;
      chaveAcesso: string;
      numero: number;
      protocolo: string | null;
    }
  | {
      ok: false;
      status: 'rejeitada' | 'erro';
      codigo?: string;
      message: string;
    };

function money2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function qty4(n: number): string {
  return Number(n).toFixed(4);
}

function pct4(n: number): string {
  return Number(n).toFixed(4);
}

/**
 * Textos SEFAZ: printable Latin-1 (padrão [!-ÿ]…), sem controles.
 * Troca traços tipográficos e afins por ASCII.
 */
function sanitizeXmlText(value: string, maxLen: number): string {
  return String(value || '')
    .replace(/[\u2010-\u2015\u2212]/g, '-') // hífens/traços tipográficos → -
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '') // só Latin-1 imprimível
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function mapFormaPagamento(raw?: string): {
  tPag: string;
  xPag?: string;
  /** Grupo card obrigatório para cartão/PIX (rejeição 391 se ausente) */
  card?: { tpIntegra: '1' | '2' };
} {
  const s = String(raw || '').toLowerCase();
  if (!s) return { tPag: '01' }; // dinheiro (NFC-e balcão)
  if (s.includes('pix')) return { tPag: '17', card: { tpIntegra: '2' } };
  if (s.includes('débito') || s.includes('debito')) {
    return { tPag: '04', card: { tpIntegra: '2' } };
  }
  if (s.includes('crédito') || s.includes('credito') || s.includes('cart')) {
    return { tPag: '03', card: { tpIntegra: '2' } };
  }
  if (s.includes('dinheiro') || s.includes('especie') || s.includes('espécie')) {
    return { tPag: '01' };
  }
  if (s.includes('transfer')) return { tPag: '18' };
  // tPag=99 exige xPag
  return { tPag: '99', xPag: sanitizeXmlText(String(raw), 60) || 'Outros' };
}

/** Ajustes no XML da NFC-e para bater com o schema da SEFAZ. */
function sanitizeNfceXml(xml: string): string {
  return (
    xml
      // Partilha interestadual não se aplica à NFC-e (rejeição 225)
      .replace(/<vFCPUFDest>[^<]*<\/vFCPUFDest>/g, '')
      .replace(/<vICMSUFDest>[^<]*<\/vICMSUFDest>/g, '')
      .replace(/<vICMSUFRemet>[^<]*<\/vICMSUFRemet>/g, '')
      // Extras que a lib coloca no total IBS/CBS fora do schema
      .replace(/<vCredPres>[^<]*<\/vCredPres>/g, '')
      .replace(/<vCredPresCondSus>[^<]*<\/vCredPresCondSus>/g, '')
  );
}

function extractChaveFromXml(xml: string): string | null {
  const m = xml.match(/Id="NFe(\d{44})"/) || xml.match(/<chNFe>(\d{44})<\/chNFe>/);
  return m?.[1] ?? null;
}

function extractProt(xml: string): {
  cStat?: string;
  xMotivo?: string;
  nProt?: string;
  chNFe?: string;
} {
  // Preferir cStat do protocolo / retEvento (último costuma ser o da nota)
  const cStats = [...xml.matchAll(/<cStat>(\d+)<\/cStat>/g)].map((m) => m[1]);
  const motivos = [...xml.matchAll(/<xMotivo>([^<]*)<\/xMotivo>/g)].map((m) => m[1]);
  const cStat = cStats.find((c) => c !== '100' && c !== '104' && c !== '103') || cStats[cStats.length - 1];
  const xMotivo =
    (cStat && motivos[cStats.lastIndexOf(cStat)]) || motivos[motivos.length - 1];
  const nProt = xml.match(/<nProt>([^<]*)<\/nProt>/)?.[1];
  const chNFe = xml.match(/<chNFe>(\d{44})<\/chNFe>/)?.[1];
  return { cStat, xMotivo, nProt, chNFe };
}

function validateNfceXmlLocal(xml: string): string | null {
  const schemaPath = path.join(
    process.cwd(),
    'node_modules/node-sped-nfe/schemas/PL_010b_V1.30/nfe_v4.00.xsd'
  );
  if (!fs.existsSync(schemaPath)) return null;
  const tmpFile = path.join(os.tmpdir(), `nfce-val-${Date.now()}.xml`);
  try {
    fs.writeFileSync(tmpFile, xml, 'utf8');
    const verif = spawnSync('xmllint', ['--noout', '--schema', schemaPath, tmpFile], {
      encoding: 'utf8',
    });
    if (verif.error) return null;
    const err = String(verif.stderr || '');
    if (err.includes('validates')) return null;
    return err
      .replace(/\/[^\s:]+\.xml/g, 'XML')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 500);
  } catch {
    return null;
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

function readPfxPem(
  pfxPath: string,
  password: string
): Promise<{ key: string; cert: string }> {
  return new Promise((resolve, reject) => {
    pem.readPkcs12(pfxPath, { p12Password: password }, (err, myPem) => {
      if (err) reject(err);
      else resolve({ key: myPem.key, cert: myPem.cert });
    });
  });
}

/**
 * Envia o XML já assinado sem re-serializar via JSON (o roundtrip do node-sped-nfe
 * corrompe a Signature e a SEFAZ responde 225).
 */
async function enviarLoteNfceRaw(opts: {
  xmlAssinado: string;
  uf: string;
  tpAmb: number;
  timeoutSec: number;
  pfxPath: string;
  password: string;
}): Promise<string> {
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

  const url =
    opts.uf === 'SP'
      ? opts.tpAmb === 1
        ? 'https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx'
        : 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx'
      : null;
  if (!url) {
    throw new Error(`Envio raw NFC-e ainda não mapeado para UF ${opts.uf}.`);
  }

  const { key, cert } = await readPfxPem(opts.pfxPath, opts.password);

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(soap, 'utf8'),
        },
        key,
        cert,
        rejectUnauthorized: false,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      }
    );
    req.setTimeout(opts.timeoutSec * 1000, () => {
      req.destroy();
      reject(new Error('Timeout ao enviar NFC-e à SEFAZ'));
    });
    req.on('error', reject);
    req.write(soap);
    req.end();
  });
}

async function nextNumero(
  admin: SupabaseClient,
  empresaId: string,
  serie: string
): Promise<number> {
  const { data: row } = await admin
    .from('fiscal_nfce_counters')
    .select('ultimo_numero')
    .eq('empresa_id', empresaId)
    .eq('serie', serie)
    .maybeSingle();

  const atual = Number(row?.ultimo_numero || 0);
  const proximo = atual + 1;

  const { error } = await admin.from('fiscal_nfce_counters').upsert(
    {
      empresa_id: empresaId,
      serie,
      ultimo_numero: proximo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'empresa_id,serie' }
  );
  if (error) throw new Error(`Falha ao reservar número NFC-e: ${error.message}`);
  return proximo;
}

/**
 * Emite NFC-e (modelo 65) na SEFAZ-SP via node-sped-nfe.
 * Usa somente os itens informados (peças) — sem mão de obra.
 */
export async function emitirNfceNacional(
  admin: SupabaseClient,
  empresaId: string,
  input: EmitirNfceInput,
  opts?: { usuarioId?: string | null }
): Promise<EmitirNfceResult> {
  if (!input.itens?.length) {
    return { ok: false, status: 'erro', message: 'Informe ao menos um item (peça) para a NFC-e.' };
  }

  const { data: config, error: cfgErr } = await admin
    .from('fiscal_empresa_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (cfgErr) return { ok: false, status: 'erro', message: cfgErr.message };
  if (!config) return { ok: false, status: 'erro', message: 'Configure os dados fiscais antes.' };
  if (!config.nfce_ativo) {
    return { ok: false, status: 'erro', message: 'NFC-e desabilitada. Ative em Configurações → Nota Fiscal.' };
  }
  if (!config.nfce_csc || !config.nfce_id_csc) {
    return { ok: false, status: 'erro', message: 'Cadastre o ID CSC e o Token CSC.' };
  }
  if (!config.inscricao_estadual) {
    return { ok: false, status: 'erro', message: 'Inscrição estadual (IE) é obrigatória para NFC-e.' };
  }
  if (!config.end_logradouro || !config.end_numero || !config.end_bairro || !config.end_cep) {
    return {
      ok: false,
      status: 'erro',
      message: 'Complete o endereço do emitente (logradouro, número, bairro e CEP) na config fiscal.',
    };
  }

  const { data: cert, error: certErr } = await admin
    .from('fiscal_certificados')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .maybeSingle();
  if (certErr) return { ok: false, status: 'erro', message: certErr.message };
  if (!cert) return { ok: false, status: 'erro', message: 'Envie o certificado A1.' };

  const { pfx, password } = unsealPfx(cert.pfx_ciphertext, cert.password_ciphertext);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nfce-'));
  const pfxPath = path.join(tmpDir, 'cert.pfx');
  fs.writeFileSync(pfxPath, pfx);

  const cfg = config as FiscalEmpresaConfig & {
    nfce_csc: string;
    nfce_id_csc: string;
    nfce_serie?: string;
    end_logradouro: string;
    end_numero: string;
    end_complemento?: string | null;
    end_bairro: string;
    end_cep: string;
    end_fone?: string | null;
    nfce_ncm_padrao?: string | null;
    nfce_cfop_padrao?: string | null;
    nfce_csosn_padrao?: string | null;
    resp_tec_cnpj?: string | null;
    resp_tec_contato?: string | null;
    resp_tec_email?: string | null;
    resp_tec_fone?: string | null;
  };

  const uf = (cfg.uf || 'SP').toUpperCase();
  const cUF = String(UF2cUF[uf as keyof typeof UF2cUF] || '35');
  const tpAmb = cfg.ambiente === 'producao' ? 1 : 2;
  const serie = String(cfg.nfce_serie || '1').replace(/\D/g, '') || '1';
  // 85177900 = partes de aparelhos telefônicos (vigente desde 2022). 85177099/85423990 foram extintos.
  const ncmPadrao = (cfg.nfce_ncm_padrao || '85177900').replace(/\D/g, '');
  const cfopPadrao = (cfg.nfce_cfop_padrao || '5102').replace(/\D/g, '');
  const csosn = (cfg.nfce_csosn_padrao || '102').replace(/\D/g, '');

  // CRT: 1=Simples, 2=Simples excesso, 3=Normal — MEI/ME/EPP = 1
  const crt = cfg.opcao_simples === 'nao_optante' ? '3' : '1';

  let nNF: number;
  try {
    nNF = await nextNumero(admin, empresaId, serie);
  } catch (e) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { ok: false, status: 'erro', message: e instanceof Error ? e.message : 'Erro no contador' };
  }

  const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const total = input.itens.reduce(
    (acc, it) => acc + Number(it.quantidade) * Number(it.valorUnitario),
    0
  );
  const vNF = money2(total);
  const pag = mapFormaPagamento(input.formaPagamento);
  const vPag = money2(input.valorPago ?? total);
  const cMun = String(cfg.cod_municipio_ibge || '').replace(/\D/g, '');
  if (cMun.length !== 7) {
    return {
      ok: false,
      status: 'erro',
      message: 'Código IBGE do município do emitente deve ter 7 dígitos.',
    };
  }
  const ncmOk = ncmPadrao.length === 8;
  if (!ncmOk) {
    return {
      ok: false,
      status: 'erro',
      message: 'NCM padrão da NFC-e deve ter 8 dígitos (Configurações → Nota Fiscal).',
    };
  }

  try {
    const tools = new Tools(
      {
        mod: '65',
        tpAmb,
        UF: uf,
        versao: '4.00',
        CSC: String(cfg.nfce_csc || '').trim(),
        CSCid: String(cfg.nfce_id_csc || '').replace(/\D/g, ''),
        timeout: 60,
        xmllint: 'xmllint',
        openssl: null,
        CPF: '',
        CNPJ: onlyDigitsDoc(cfg.cnpj),
      },
      { pfx: pfxPath, senha: password }
    );

    const NFe = new Make();
    NFe.tagInfNFe({ Id: null, versao: '4.00' });
    // indPres=1 (presencial): NÃO enviar indIntermed (causa rejeição / schema)
    NFe.tagIde({
      cUF,
      cNF,
      natOp: 'VENDA',
      mod: '65',
      serie,
      nNF: String(nNF),
      dhEmi: NFe.formatData(),
      tpNF: '1',
      idDest: '1',
      cMunFG: cMun,
      tpImp: '4',
      tpEmis: '1',
      cDV: '0',
      tpAmb: String(tpAmb),
      finNFe: '1',
      indFinal: '1',
      indPres: '1',
      procEmi: '0',
      verProc: 'GC1.0',
    });

    NFe.tagEmit({
      CNPJ: onlyDigitsDoc(cfg.cnpj),
      xNome: sanitizeXmlText(cfg.razao_social, 60),
      xFant: sanitizeXmlText(cfg.nome_fantasia || cfg.razao_social, 60),
      IE: onlyDigitsDoc(cfg.inscricao_estadual || ''),
      CRT: crt,
    });

    const xMun =
      (cMun2Mun as Record<string, string>)[cMun] ||
      sanitizeXmlText(String((cfg as { end_municipio?: string }).end_municipio || ''), 60) ||
      'Ilhabela';
    // Ordem obrigatória do schema: xLgr, nro, xCpl?, xBairro, cMun, xMun, UF, CEP, cPais, xPais, fone?
    const enderEmit: Record<string, string> = {
      xLgr: sanitizeXmlText(cfg.end_logradouro, 60),
      nro: sanitizeXmlText(cfg.end_numero, 60),
    };
    const xCpl = sanitizeXmlText(cfg.end_complemento || '', 60);
    if (xCpl) enderEmit.xCpl = xCpl;
    enderEmit.xBairro = sanitizeXmlText(cfg.end_bairro, 60);
    enderEmit.cMun = cMun;
    enderEmit.xMun = sanitizeXmlText(xMun, 60);
    enderEmit.UF = uf;
    enderEmit.CEP = onlyDigitsDoc(cfg.end_cep).padStart(8, '0');
    enderEmit.cPais = '1058';
    enderEmit.xPais = 'BRASIL';
    const fone = onlyDigitsDoc(cfg.end_fone || '');
    if (fone.length >= 6 && fone.length <= 14) enderEmit.fone = fone;
    NFe.tagEnderEmit(enderEmit);

    const docTom = onlyDigitsDoc(input.tomador?.documento || '');
    if (docTom.length === 11 || docTom.length === 14) {
      NFe.tagDest({
        ...(docTom.length === 11 ? { CPF: docTom } : { CNPJ: docTom }),
        xNome:
          tpAmb === 2
            ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
            : sanitizeXmlText(input.tomador?.nome || 'CONSUMIDOR', 60),
        indIEDest: '9',
      });
    }

    const prods = input.itens.map((it, idx) => {
      const q = Number(it.quantidade) || 1;
      const vu = Number(it.valorUnitario) || 0;
      const vProd = money2(q * vu);
      const ncm = (it.ncm || ncmPadrao).replace(/\D/g, '').padStart(8, '0').slice(0, 8);
      const cfop = (it.cfop || cfopPadrao).replace(/\D/g, '').slice(0, 4);
      return {
        cProd: sanitizeXmlText(String(it.codigo || idx + 1), 60),
        cEAN: 'SEM GTIN',
        xProd:
          tpAmb === 2 && idx === 0
            ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
            : sanitizeXmlText(String(it.descricao || 'PECA'), 120),
        NCM: ncm,
        CFOP: cfop,
        uCom: sanitizeXmlText(it.unidade || 'UN', 6) || 'UN',
        qCom: qty4(q),
        vUnCom: Number(vu).toFixed(10),
        vProd,
        cEANTrib: 'SEM GTIN',
        uTrib: sanitizeXmlText(it.unidade || 'UN', 6) || 'UN',
        qTrib: qty4(q),
        vUnTrib: Number(vu).toFixed(10),
        indTot: '1',
      };
    });

    await NFe.tagProd(prods);

    // Alíquotas de teste 2026 (RTC): IBS-UF 0,1% + CBS 0,9% + IBS-Mun 0%
    const pIbsUf = 0.1;
    const pIbsMun = 0;
    const pCbs = 0.9;
    const incluirIbsCbs = crt === '3'; // Regime normal — obrigatório desde 03/08/2026

    for (let i = 0; i < prods.length; i++) {
      if (crt === '1') {
        NFe.tagProdICMSSN(i, { orig: '0', CSOSN: csosn });
      } else {
        NFe.tagProdICMS(i, {
          orig: '0',
          CST: '00',
          modBC: '3',
          vBC: '0.00',
          pICMS: '0.00',
          vICMS: '0.00',
        });
      }
      // PIS/COFINS Outr com base percentual (mais compatível que qtde zerada)
      NFe.tagProdPIS(i, { CST: '49', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' });
      NFe.tagProdCOFINS(i, { CST: '49', vBC: '0.00', pCOFINS: '0.00', vCOFINS: '0.00' });

      if (incluirIbsCbs) {
        const vItem = Number(prods[i].vProd);
        const vIbsUf = Number(money2((vItem * pIbsUf) / 100));
        const vIbsMun = Number(money2((vItem * pIbsMun) / 100));
        const vCbs = Number(money2((vItem * pCbs) / 100));
        const vIbs = Number(money2(vIbsUf + vIbsMun));
        NFe.tagProdIBSCBS(i, {
          CST: '000',
          cClassTrib: '000001',
          gIBSCBS: {
            vBC: money2(vItem),
            gIBSUF: { pIBSUF: pct4(pIbsUf), vIBSUF: money2(vIbsUf) },
            gIBSMun: { pIBSMun: pct4(pIbsMun), vIBSMun: money2(vIbsMun) },
            vIBS: money2(vIbs),
            gCBS: { pCBS: pct4(pCbs), vCBS: money2(vCbs) },
          },
        });
      }
    }

    NFe.tagTotal();
    NFe.tagTransp({ modFrete: '9' });

    const detPag: Record<string, unknown> = {
      tPag: pag.tPag,
      vPag,
    };
    if (pag.xPag) detPag.xPag = pag.xPag;
    // Cartão/PIX: SEFAZ exige <card><tpIntegra> (2 = POS não integrado)
    if (pag.card) detPag.card = pag.card;
    NFe.tagDetPag([detPag]);

    if (input.informacoes) {
      NFe.tagInfAdic({ infCpl: sanitizeXmlText(input.informacoes, 5000) });
    }

    const respCnpj = onlyDigitsDoc(cfg.resp_tec_cnpj || cfg.cnpj);
    const respFone = onlyDigitsDoc(cfg.resp_tec_fone || cfg.end_fone || '12999999999');
    NFe.tagInfRespTec({
      CNPJ: respCnpj,
      xContato: sanitizeXmlText(cfg.resp_tec_contato || cfg.razao_social, 60),
      email: sanitizeXmlText(cfg.resp_tec_email || 'suporte@gestaoconsert.com.br', 60),
      fone: respFone.length >= 6 ? respFone : '12999999999',
    });

    let xml = NFe.xml();
    xml = sanitizeNfceXml(xml);
    const xmlSign = await tools.xmlSign(xml);

    // Valida localmente (se xmllint existir) — devolve o campo quebrado antes da SEFAZ
    const schemaErr = validateNfceXmlLocal(xmlSign);
    if (schemaErr) {
      console.error('NFC-e schema local:', schemaErr);
      return {
        ok: false,
        status: 'erro',
        codigo: '225',
        message: `XML inválido (schema): ${schemaErr}`,
      };
    }

    // Envio sem roundtrip JSON (evita corromper Signature → rejeição 225)
    const resposta = await enviarLoteNfceRaw({
      xmlAssinado: xmlSign,
      uf,
      tpAmb,
      timeoutSec: 60,
      pfxPath,
      password,
    });

    const prot = extractProt(String(resposta));
    const chave = prot.chNFe || extractChaveFromXml(xmlSign) || '';

    if (prot.cStat !== '100' && prot.cStat !== '150') {
      console.error('NFC-e rejeitada:', {
        cStat: prot.cStat,
        xMotivo: prot.xMotivo,
        nNF,
        serie,
        resposta: String(resposta).slice(0, 1500),
      });
      return {
        ok: false,
        status: 'rejeitada',
        codigo: prot.cStat,
        message: prot.xMotivo || `SEFAZ rejeitou (cStat ${prot.cStat || '?'})`,
      };
    }

    if (!chave || chave.length !== 44) {
      return {
        ok: false,
        status: 'erro',
        message: 'NFC-e autorizada, mas chave de acesso não foi lida na resposta.',
      };
    }

    const { data: row, error: insErr } = await admin
      .from('fiscal_nfce')
      .insert({
        empresa_id: empresaId,
        chave_acesso: chave,
        numero: nNF,
        serie,
        status: 'autorizada',
        tipo_ambiente: tpAmb,
        protocolo: prot.nProt || null,
        xml_nfce: xmlSign,
        xml_prot: String(resposta),
        valor_total: Number(vNF),
        ordem_servico_id: input.ordemServicoId || null,
        venda_id: input.vendaId || null,
        emitido_por_usuario_id: opts?.usuarioId || null,
        dh_emi: new Date().toISOString(),
        dh_recbto: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('fiscal_nfce insert:', insErr, { chave, nNF });
      return {
        ok: true,
        status: 'autorizada',
        nfceId: '',
        chaveAcesso: chave,
        numero: nNF,
        protocolo: prot.nProt || null,
      };
    }

    // Flag opcional em vendas (coluna pode não existir em todos os ambientes)
    if (input.vendaId) {
      try {
        await admin.from('vendas').update({ nfce_emitida: true }).eq('id', input.vendaId);
      } catch {
        /* ignore */
      }
    }

    return {
      ok: true,
      status: 'autorizada',
      nfceId: row.id,
      chaveAcesso: chave,
      numero: nNF,
      protocolo: prot.nProt || null,
    };
  } catch (e) {
    return {
      ok: false,
      status: 'erro',
      message: e instanceof Error ? e.message : 'Erro ao emitir NFC-e',
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
