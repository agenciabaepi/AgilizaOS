import type { SupabaseClient } from '@supabase/supabase-js';
import { Make, UF2cUF, cMun2Mun } from 'node-sped-nfe';
import { unsealPfx, onlyDigitsDoc } from '../crypto/certificado';
import { pfxToPem } from '../crypto/pfxPem';
import { assinarXmlNfe } from '../sefaz/assinarXml';
import { enviarLoteSefaz, urlAutorizacaoNfeSp } from '../sefaz/enviarLote';
import type { FiscalEmpresaConfig } from '../types';

export type NfeItem = {
  codigo?: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  ncm?: string;
  cfop?: string;
  unidade?: string;
};

export type EmitirNfeInput = {
  itens: NfeItem[];
  valorPago?: number;
  formaPagamento?: string;
  tomador: {
    documento: string;
    nome?: string;
    /** IE do destinatário (só dígitos). Obrigatória se indIEDest=1 */
    ie?: string;
    /**
     * 1=contribuinte ICMS, 2=isento, 9=não contribuinte
     * Default: 9 (PF / PJ sem IE)
     */
    indIEDest?: '1' | '2' | '9';
    endereco?: {
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      municipio?: string;
      uf?: string;
      cep?: string;
      /** IBGE 7 dígitos; se ausente, usa o do emitente */
      codigoMunicipio?: string;
    };
  };
  ordemServicoId?: string;
  vendaId?: string;
  informacoes?: string;
};

export type EmitirNfeResult =
  | {
      ok: true;
      status: 'autorizada';
      nfeId: string;
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

function sanitizeXmlText(value: string, maxLen: number): string {
  return String(value || '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function mapFormaPagamento(raw?: string): {
  tPag: string;
  xPag?: string;
  card?: { tpIntegra: '1' | '2' };
} {
  const s = String(raw || '').toLowerCase();
  if (!s) return { tPag: '01' };
  if (s.includes('pix')) return { tPag: '17', card: { tpIntegra: '2' } };
  if (s.includes('débito') || s.includes('debito')) return { tPag: '04', card: { tpIntegra: '2' } };
  if (s.includes('crédito') || s.includes('credito') || s.includes('cart')) {
    return { tPag: '03', card: { tpIntegra: '2' } };
  }
  if (s.includes('dinheiro') || s.includes('especie') || s.includes('espécie')) return { tPag: '01' };
  if (s.includes('transfer')) return { tPag: '18' };
  return { tPag: '99', xPag: sanitizeXmlText(String(raw), 60) || 'Outros' };
}

function sanitizeNfeXml(xml: string): string {
  return (
    xml
      .replace(/<vFCPUFDest>[^<]*<\/vFCPUFDest>/g, '')
      .replace(/<vICMSUFDest>[^<]*<\/vICMSUFDest>/g, '')
      .replace(/<vICMSUFRemet>[^<]*<\/vICMSUFRemet>/g, '')
      .replace(/<vCredPres>[^<]*<\/vCredPres>/g, '')
      .replace(/<vCredPresCondSus>[^<]*<\/vCredPresCondSus>/g, '')
      // node-sped-nfe cria <enderDest/> vazio no mod 55 — schema exige xLgr
      .replace(/<enderDest\s*\/>/g, '')
      .replace(/<enderDest>\s*<\/enderDest>/g, '')
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
  const cStats = [...xml.matchAll(/<cStat>(\d+)<\/cStat>/g)].map((m) => m[1]);
  const motivos = [...xml.matchAll(/<xMotivo>([^<]*)<\/xMotivo>/g)].map((m) => m[1]);
  const cStat =
    cStats.find((c) => c !== '100' && c !== '104' && c !== '103') || cStats[cStats.length - 1];
  const xMotivo = (cStat && motivos[cStats.lastIndexOf(cStat)]) || motivos[motivos.length - 1];
  const nProt = xml.match(/<nProt>([^<]*)<\/nProt>/)?.[1];
  const chNFe = xml.match(/<chNFe>(\d{44})<\/chNFe>/)?.[1];
  return { cStat, xMotivo, nProt, chNFe };
}

async function nextNumero(
  admin: SupabaseClient,
  empresaId: string,
  serie: string
): Promise<number> {
  const { data: row } = await admin
    .from('fiscal_nfe_counters')
    .select('ultimo_numero')
    .eq('empresa_id', empresaId)
    .eq('serie', serie)
    .maybeSingle();

  const atual = Number(row?.ultimo_numero || 0);
  const proximo = atual + 1;
  const { error } = await admin.from('fiscal_nfe_counters').upsert(
    {
      empresa_id: empresaId,
      serie,
      ultimo_numero: proximo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'empresa_id,serie' }
  );
  if (error) throw new Error(`Falha ao reservar número NF-e: ${error.message}`);
  return proximo;
}

/**
 * Emite NF-e (modelo 55) na SEFAZ — DANFE A4 padrão.
 * Usa somente os itens informados (peças).
 */
export async function emitirNfeNacional(
  admin: SupabaseClient,
  empresaId: string,
  input: EmitirNfeInput,
  opts?: { usuarioId?: string | null }
): Promise<EmitirNfeResult> {
  if (!input.itens?.length) {
    return { ok: false, status: 'erro', message: 'Informe ao menos um item para a NF-e.' };
  }
  const docTom = onlyDigitsDoc(input.tomador?.documento || '');
  if (docTom.length !== 11 && docTom.length !== 14) {
    return {
      ok: false,
      status: 'erro',
      message: 'NF-e exige CPF ou CNPJ do destinatário.',
    };
  }

  const { data: config, error: cfgErr } = await admin
    .from('fiscal_empresa_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (cfgErr) return { ok: false, status: 'erro', message: cfgErr.message };
  if (!config) return { ok: false, status: 'erro', message: 'Configure os dados fiscais antes.' };
  if (!config.nfe_ativo) {
    return {
      ok: false,
      status: 'erro',
      message: 'NF-e desabilitada. Ative em Configurações → Nota Fiscal.',
    };
  }
  if (!config.inscricao_estadual) {
    return { ok: false, status: 'erro', message: 'Inscrição estadual (IE) é obrigatória para NF-e.' };
  }
  if (!config.end_logradouro || !config.end_numero || !config.end_bairro || !config.end_cep) {
    return {
      ok: false,
      status: 'erro',
      message: 'Complete o endereço do emitente na config fiscal.',
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

  let keyPem: string;
  let certPem: string;
  try {
    const t0 = Date.now();
    const { pfx, password } = unsealPfx(cert.pfx_ciphertext, cert.password_ciphertext);
    const pemPair = pfxToPem(pfx, password);
    keyPem = pemPair.key;
    certPem = pemPair.cert;
    console.log('[nfe] pfxToPem ms=', Date.now() - t0);
  } catch (e) {
    return {
      ok: false,
      status: 'erro',
      message: e instanceof Error ? e.message : 'Falha ao ler certificado A1',
    };
  }

  const cfg = config as FiscalEmpresaConfig & {
    nfe_serie?: string;
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
  const serie = String(cfg.nfe_serie || '1').replace(/\D/g, '') || '1';
  const ncmPadrao = (cfg.nfce_ncm_padrao || '85177900').replace(/\D/g, '');
  const cfopPadrao = (cfg.nfce_cfop_padrao || '5102').replace(/\D/g, '');
  const csosn = (cfg.nfce_csosn_padrao || '102').replace(/\D/g, '');
  const crt = cfg.opcao_simples === 'nao_optante' ? '3' : '1';

  let nNF: number;
  try {
    nNF = await nextNumero(admin, empresaId, serie);
  } catch (e) {
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
  if (ncmPadrao.length !== 8) {
    return {
      ok: false,
      status: 'erro',
      message: 'NCM padrão deve ter 8 dígitos (Configurações → Nota Fiscal).',
    };
  }

  try {
    const tBuild = Date.now();
    const NFe = new Make();
    NFe.tagInfNFe({ Id: null, versao: '4.00' });
    NFe.tagIde({
      cUF,
      cNF,
      natOp: 'VENDA',
      mod: '55',
      serie,
      nNF: String(nNF),
      dhEmi: NFe.formatData(),
      tpNF: '1',
      idDest: '1',
      cMunFG: cMun,
      tpImp: '1', // DANFE normal retrato
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

    const ieTom = onlyDigitsDoc(input.tomador?.ie || '');
    let indIEDest: '1' | '2' | '9' = input.tomador?.indIEDest || '9';
    if (ieTom && indIEDest === '9') indIEDest = '1';
    if (indIEDest === '1' && !ieTom) {
      return {
        ok: false,
        status: 'erro',
        message:
          'Cliente contribuinte de ICMS sem Inscrição Estadual. Cadastre a IE no cliente (PJ).',
      };
    }

    const destTag: Record<string, string> = {
      ...(docTom.length === 11 ? { CPF: docTom } : { CNPJ: docTom }),
      xNome:
        tpAmb === 2
          ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
          : sanitizeXmlText(input.tomador?.nome || 'DESTINATARIO', 60),
      indIEDest,
    };
    if (indIEDest === '1' && ieTom) destTag.IE = ieTom;
    NFe.tagDest(destTag);

    // mod 55: tagDest cria enderDest vazio — preencher obrigatório (xLgr…)
    const endTom = input.tomador?.endereco || {};
    const destLgr =
      sanitizeXmlText(endTom.logradouro || cfg.end_logradouro || 'NAO INFORMADO', 60) ||
      'NAO INFORMADO';
    const destNro = sanitizeXmlText(endTom.numero || 'S/N', 60) || 'S/N';
    const destBairro =
      sanitizeXmlText(endTom.bairro || cfg.end_bairro || 'CENTRO', 60) || 'CENTRO';
    const destCMun = onlyDigitsDoc(endTom.codigoMunicipio || cMun).padStart(7, '0').slice(0, 7);
    const destXMun =
      sanitizeXmlText(
        endTom.municipio ||
          (cMun2Mun as Record<string, string>)[destCMun] ||
          xMun,
        60
      ) || xMun;
    const destUf = (endTom.uf || uf).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || uf;
    const destCep = onlyDigitsDoc(endTom.cep || cfg.end_cep || '').padStart(8, '0').slice(0, 8);
    const enderDest: Record<string, string> = {
      xLgr: destLgr,
      nro: destNro,
      xBairro: destBairro,
      cMun: destCMun.length === 7 ? destCMun : cMun,
      xMun: destXMun,
      UF: destUf,
      CEP: destCep.length === 8 ? destCep : onlyDigitsDoc(cfg.end_cep).padStart(8, '0'),
      cPais: '1058',
      xPais: 'BRASIL',
    };
    const destCpl = sanitizeXmlText(endTom.complemento || '', 60);
    if (destCpl) enderDest.xCpl = destCpl;
    NFe.tagEnderDest(enderDest);

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

    const pIbsUf = 0.1;
    const pIbsMun = 0;
    const pCbs = 0.9;
    const incluirIbsCbs = crt === '3';

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

    NFe.tagTotal({});
    NFe.tagTransp({ modFrete: '9' });

    const detPag: Record<string, unknown> = { tPag: pag.tPag, vPag };
    if (pag.xPag) detPag.xPag = pag.xPag;
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
    xml = sanitizeNfeXml(xml);
    console.log('[nfe] build xml ms=', Date.now() - tBuild);

    const tSign = Date.now();
    const xmlSign = assinarXmlNfe(xml, keyPem, certPem);
    console.log('[nfe] assinar ms=', Date.now() - tSign);

    if (uf !== 'SP') {
      return {
        ok: false,
        status: 'erro',
        message: `Envio de NF-e ainda não mapeado para UF ${uf}.`,
      };
    }

    const tSend = Date.now();
    const resposta = await enviarLoteSefaz({
      xmlAssinado: xmlSign,
      url: urlAutorizacaoNfeSp(tpAmb),
      keyPem,
      certPem,
      timeoutMs: 25_000,
      connectTimeoutMs: 12_000,
    });
    console.log('[nfe] sefaz ms=', Date.now() - tSend, 'bytes=', String(resposta).length);

    const prot = extractProt(String(resposta));
    const chave = prot.chNFe || extractChaveFromXml(xmlSign) || '';

    if (prot.cStat !== '100' && prot.cStat !== '150') {
      console.error('NF-e rejeitada:', {
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
        message: 'NF-e autorizada, mas chave de acesso não foi lida na resposta.',
      };
    }

    const { data: row, error: insErr } = await admin
      .from('fiscal_nfe')
      .insert({
        empresa_id: empresaId,
        chave_acesso: chave,
        numero: nNF,
        serie,
        status: 'autorizada',
        tipo_ambiente: tpAmb,
        protocolo: prot.nProt || null,
        xml_nfe: xmlSign,
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
      console.error('fiscal_nfe insert:', insErr, { chave, nNF });
      return {
        ok: true,
        status: 'autorizada',
        nfeId: '',
        chaveAcesso: chave,
        numero: nNF,
        protocolo: prot.nProt || null,
      };
    }

    return {
      ok: true,
      status: 'autorizada',
      nfeId: row.id,
      chaveAcesso: chave,
      numero: nNF,
      protocolo: prot.nProt || null,
    };
  } catch (e) {
    return {
      ok: false,
      status: 'erro',
      message: e instanceof Error ? e.message : 'Erro ao emitir NF-e',
    };
  }
}
