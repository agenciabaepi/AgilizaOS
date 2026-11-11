import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import {
  CUPOM_MARGIN,
  CUPOM_W,
  center,
  drawLogoTopo,
  estimateCupomHeight,
  fmtDateTimeBr,
  fmtQty,
  formatChave,
  formatCep,
  formatCnpjCpf,
  labelTPag,
  left,
  money,
  moneyBrl,
  rodapeSistema,
  rowLR,
  sepLine,
  xmlBlock,
  xmlBlocks,
  xmlCdata,
  xmlTag,
  type CupomLogo,
} from '../cupom-termico';

export type NfceDanfeInput = {
  chaveAcesso: string;
  numero: number;
  serie: string;
  protocolo?: string | null;
  valorTotal?: number | null;
  tipoAmbiente: number;
  dhEmi?: string | null;
  xmlNfce?: string | null;
  logo?: CupomLogo | null;
};

type NfceItem = {
  cProd: string;
  xProd: string;
  qCom: number;
  uCom: string;
  vUnCom: number;
  vProd: number;
};

type NfcePag = { tPag: string; xPag?: string; vPag: number };

function parseItems(xml: string): NfceItem[] {
  return xmlBlocks(xml, 'det').map((det) => {
    const prod = xmlBlock(det, 'prod') || det;
    return {
      cProd: xmlTag(prod, 'cProd') || '—',
      xProd: xmlTag(prod, 'xProd') || 'Item',
      qCom: Number(xmlTag(prod, 'qCom') || 1),
      uCom: xmlTag(prod, 'uCom') || 'UN',
      vUnCom: Number(xmlTag(prod, 'vUnCom') || 0),
      vProd: Number(xmlTag(prod, 'vProd') || 0),
    };
  });
}

function parsePags(xml: string): NfcePag[] {
  const dets = xmlBlocks(xml, 'detPag');
  if (!dets.length) {
    const vNF = Number(xmlTag(xml, 'vNF') || 0);
    return vNF > 0 ? [{ tPag: '01', vPag: vNF }] : [];
  }
  return dets.map((d) => ({
    tPag: xmlTag(d, 'tPag') || '99',
    xPag: xmlTag(d, 'xPag') || undefined,
    vPag: Number(xmlTag(d, 'vPag') || 0),
  }));
}

type NfceParsed = {
  emitNome: string;
  emitFant: string;
  emitCnpj: string;
  emitIe: string;
  endLgr: string;
  endNro: string;
  endCpl: string;
  endBairro: string;
  endMun: string;
  endUf: string;
  endCep: string;
  endFone: string;
  destNome: string;
  destDoc: string;
  consumidorId: boolean;
  items: NfceItem[];
  pags: NfcePag[];
  vNF: number;
  vDesc: number;
  vProd: number;
  vTotTrib: number;
  vTroco: number;
  chave: string;
  protocolo: string;
  dhRecbto: string;
  dhEmiRaw: string | null | undefined;
  serie: string;
  numero: number;
  consultaUrl: string;
  homolog: boolean;
};

function parseNfce(input: NfceDanfeInput): NfceParsed {
  const xml = input.xmlNfce || '';
  const emitBlock = xmlBlock(xml, 'emit');
  const enderEmit = xmlBlock(xml, 'enderEmit') || xmlBlock(emitBlock, 'enderEmit');
  const destBlock = xmlBlock(xml, 'dest');
  const protBlock = xmlBlock(xml, 'infProt') || xmlBlock(xml, 'protNFe');
  const destDoc = formatCnpjCpf(xmlTag(destBlock, 'CPF') || xmlTag(destBlock, 'CNPJ'));
  const chave = (input.chaveAcesso || xmlTag(xml, 'chNFe') || '').replace(/\D/g, '');
  const qrFromXml = xmlCdata(xml, 'qrCode');
  return {
    emitNome: xmlTag(emitBlock, 'xNome') || 'Emitente',
    emitFant: xmlTag(emitBlock, 'xFant'),
    emitCnpj: formatCnpjCpf(xmlTag(emitBlock, 'CNPJ')),
    emitIe: xmlTag(emitBlock, 'IE') || 'ISENTO',
    endLgr: xmlTag(enderEmit, 'xLgr'),
    endNro: xmlTag(enderEmit, 'nro'),
    endCpl: xmlTag(enderEmit, 'xCpl'),
    endBairro: xmlTag(enderEmit, 'xBairro'),
    endMun: xmlTag(enderEmit, 'xMun'),
    endUf: xmlTag(enderEmit, 'UF'),
    endCep: formatCep(xmlTag(enderEmit, 'CEP')),
    endFone: xmlTag(enderEmit, 'fone'),
    destNome: xmlTag(destBlock, 'xNome'),
    destDoc,
    consumidorId: Boolean(destDoc && destDoc !== '—'),
    items: parseItems(xml),
    pags: parsePags(xml),
    vNF: Number(xmlTag(xml, 'vNF') || input.valorTotal || 0),
    vDesc: Number(xmlTag(xml, 'vDesc') || 0),
    vProd: Number(xmlTag(xml, 'vProd') || input.valorTotal || 0),
    vTotTrib: Number(xmlTag(xml, 'vTotTrib') || 0),
    vTroco: Number(xmlTag(xml, 'vTroco') || 0),
    chave,
    protocolo: input.protocolo || xmlTag(protBlock, 'nProt') || xmlTag(xml, 'nProt') || '',
    dhRecbto: xmlTag(protBlock, 'dhRecbto') || xmlTag(xml, 'dhRecbto') || '',
    dhEmiRaw: input.dhEmi || xmlTag(xml, 'dhEmi'),
    serie: String(input.serie || xmlTag(xml, 'serie') || '1'),
    numero: Number(input.numero || xmlTag(xml, 'nNF') || 0),
    consultaUrl:
      qrFromXml ||
      `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx?chave=${chave}`,
    homolog: Number(input.tipoAmbiente) === 2 || xmlTag(xml, 'tpAmb') === '2',
  };
}

/** Alias do cupom 80mm (compat). */
export async function gerarDanfeNfce(input: NfceDanfeInput): Promise<Buffer> {
  return gerarDanfeNfceCupom(input);
}

/**
 * DANFE NFC-e — leiaute oficial em bobina 80mm
 * (Manual de Especificações Técnicas do DANFE NFC-e / SEFAZ).
 */
export async function gerarDanfeNfceCupom(input: NfceDanfeInput): Promise<Buffer> {
  const d = parseNfce(input);
  const qrPng = await QRCode.toBuffer(d.consultaUrl, {
    type: 'png',
    width: 180,
    margin: 0,
    errorCorrectionLevel: 'M',
  });

  const itemLines = d.items.reduce((acc, it) => acc + 2 + Math.ceil(it.xProd.length / 36), 0);
  const pageH = estimateCupomHeight({
    headerLines: 18 + (input.logo ? 5 : 0),
    itemLines: Math.max(itemLines, 2),
    extraLines: 28 + d.pags.length * 2,
    hasQr: true,
  });

  const x0 = CUPOM_MARGIN;
  const w = CUPOM_W - CUPOM_MARGIN * 2;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [CUPOM_W, pageH],
      margin: 0,
      autoFirstPage: true,
      info: {
        Title: `DANFE NFC-e ${d.numero}`,
        Author: 'Gestão Consert — DANFE NFC-e 80mm',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = CUPOM_MARGIN;
    y = drawLogoTopo(doc, input.logo, x0, y, w, { maxW: w * 0.75, maxH: 32 });

    if (d.emitFant) {
      y = center(doc, d.emitFant.toUpperCase(), x0, y, w, { bold: true, size: 9 });
      y += 2;
      y = center(doc, d.emitNome, x0, y, w, { size: 6.5 });
    } else {
      y = center(doc, d.emitNome.toUpperCase(), x0, y, w, { bold: true, size: 9 });
    }
    y += 2;

    const endParts = [
      d.endLgr,
      d.endNro,
      d.endCpl,
      d.endBairro,
      d.endMun && d.endUf ? `${d.endMun}/${d.endUf}` : d.endMun || d.endUf,
      d.endCep,
    ].filter(Boolean);
    if (endParts.length) y = center(doc, endParts.join(', '), x0, y, w, { size: 6.5 });
    y = center(doc, `CNPJ: ${d.emitCnpj}  IE: ${d.emitIe}`, x0, y, w, { size: 6.5 });
    if (d.endFone) y = center(doc, `Tel: ${d.endFone}`, x0, y, w, { size: 6.5 });
    y += 2;
    y = sepLine(doc, x0, y, w);

    y = center(doc, 'DANFE NFC-e', x0, y, w, { bold: true, size: 10 });
    y = center(doc, 'Documento Auxiliar da Nota Fiscal', x0, y, w, { size: 6.5 });
    y = center(doc, 'de Consumidor Eletrônica', x0, y, w, { size: 6.5 });
    y += 2;

    if (d.homolog) {
      y = center(doc, 'EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO', x0, y, w, {
        bold: true,
        size: 7,
        color: '#c00',
      });
      y = center(doc, 'SEM VALOR FISCAL', x0, y, w, { bold: true, size: 7, color: '#c00' });
      y += 2;
    }

    y = center(doc, `NFC-e nº ${String(d.numero).padStart(6, '0')}  Série ${d.serie}`, x0, y, w, {
      bold: true,
      size: 8,
    });
    y = center(doc, `Emissão: ${fmtDateTimeBr(d.dhEmiRaw)}`, x0, y, w, { size: 7 });
    y = center(doc, 'Via do Consumidor', x0, y, w, { size: 7 });
    y += 2;
    y = sepLine(doc, x0, y, w);

    if (d.consumidorId) {
      y = left(doc, 'CONSUMIDOR', x0, y, w, { bold: true, size: 7 });
      if (d.destNome) y = left(doc, d.destNome, x0, y, w, { size: 7 });
      y = left(doc, `CPF/CNPJ: ${d.destDoc}`, x0, y, w, { size: 7 });
    } else {
      y = center(doc, 'CONSUMIDOR NÃO IDENTIFICADO', x0, y, w, { bold: true, size: 7 });
    }
    y += 2;
    y = sepLine(doc, x0, y, w);

    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#000');
    doc.text('#', x0, y, { width: 14, lineBreak: false });
    doc.text('CÓDIGO', x0 + 14, y, { width: 42, lineBreak: false });
    doc.text('DESCRIÇÃO', x0 + 56, y, { width: w - 56, lineBreak: false });
    y += 9;
    doc.text('QTD', x0, y, { width: 36, lineBreak: false });
    doc.text('UN', x0 + 36, y, { width: 22, lineBreak: false });
    doc.text('VL UNIT', x0 + 58, y, { width: 50, align: 'right', lineBreak: false });
    doc.text('VL TOTAL', x0 + w - 50, y, { width: 50, align: 'right', lineBreak: false });
    y += 8;
    y = sepLine(doc, x0, y, w, true);

    const list = d.items.length
      ? d.items
      : [{ cProd: '—', xProd: 'Item', qCom: 1, uCom: 'UN', vUnCom: d.vNF, vProd: d.vNF }];
    list.forEach((it, idx) => {
      doc.font('Helvetica').fontSize(6.5).fillColor('#000');
      doc.text(String(idx + 1).padStart(2, '0'), x0, y, { width: 14, lineBreak: false });
      doc.text(it.cProd.slice(0, 10), x0 + 14, y, { width: 42, lineBreak: false });
      y = left(doc, it.xProd, x0 + 56, y, w - 56, { size: 6.5 });
      doc.font('Helvetica').fontSize(6.5);
      doc.text(fmtQty(it.qCom), x0, y, { width: 36, lineBreak: false });
      doc.text(it.uCom.slice(0, 4), x0 + 36, y, { width: 22, lineBreak: false });
      doc.text(money(it.vUnCom), x0 + 58, y, { width: 50, align: 'right', lineBreak: false });
      doc.text(money(it.vProd), x0 + w - 50, y, { width: 50, align: 'right', lineBreak: false });
      y += 10;
    });

    y = sepLine(doc, x0, y, w);
    y = rowLR(doc, 'Qtd. total de itens', String(list.length), x0, y, w, { size: 7 });
    if (d.vDesc > 0) {
      y = rowLR(doc, 'Valor dos produtos', moneyBrl(d.vProd), x0, y, w, { size: 7 });
      y = rowLR(doc, 'Descontos', `- ${moneyBrl(d.vDesc)}`, x0, y, w, { size: 7 });
    }
    y = rowLR(doc, 'VALOR TOTAL', moneyBrl(d.vNF), x0, y, w, { bold: true, size: 8 });
    y += 2;
    y = sepLine(doc, x0, y, w);

    y = left(doc, 'FORMA DE PAGAMENTO', x0, y, w, { bold: true, size: 7 });
    y += 1;
    for (const p of d.pags) {
      y = rowLR(doc, labelTPag(p.tPag, p.xPag), moneyBrl(p.vPag), x0, y, w, { size: 7 });
    }
    if (d.vTroco > 0) y = rowLR(doc, 'Troco', moneyBrl(d.vTroco), x0, y, w, { size: 7 });
    y += 2;
    y = sepLine(doc, x0, y, w);

    if (d.vTotTrib > 0) {
      y = left(
        doc,
        `Tributos totais incidentes (Lei Federal 12.741/2012): ${moneyBrl(d.vTotTrib)}`,
        x0,
        y,
        w,
        { size: 6 }
      );
      y += 2;
      y = sepLine(doc, x0, y, w);
    }

    y = center(doc, 'Consulte pela Chave de Acesso em', x0, y, w, { size: 6.5 });
    y = center(doc, 'www.nfce.fazenda.sp.gov.br', x0, y, w, { bold: true, size: 6.5 });
    y += 2;
    y = center(doc, 'CHAVE DE ACESSO', x0, y, w, { bold: true, size: 7 });
    y = center(doc, formatChave(d.chave), x0, y, w, { size: 6.5 });
    y += 4;

    const qrSize = 88;
    doc.image(qrPng, x0 + (w - qrSize) / 2, y, { width: qrSize, height: qrSize });
    y += qrSize + 6;
    y = sepLine(doc, x0, y, w);

    if (d.protocolo) {
      y = center(doc, 'Protocolo de Autorização', x0, y, w, { bold: true, size: 7 });
      y = center(doc, d.protocolo, x0, y, w, { size: 7 });
      y = center(doc, fmtDateTimeBr(d.dhRecbto || d.dhEmiRaw), x0, y, w, { size: 6.5 });
    }
    y += 2;
    y = rodapeSistema(doc, x0, y, w);

    doc.end();
  });
}
