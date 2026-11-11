import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import {
  fmtDateTimeBr,
  formatChave,
  formatCep,
  formatCnpjCpf,
  fmtQty,
  money,
  xmlBlock,
  xmlBlocks,
  xmlTag,
  type CupomLogo,
} from '../cupom-termico';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 10;

export type NfeDanfeInput = {
  chaveAcesso: string;
  numero: number;
  serie: string;
  protocolo?: string | null;
  valorTotal?: number | null;
  tipoAmbiente: number;
  dhEmi?: string | null;
  xmlNfe?: string | null;
  logo?: CupomLogo | null;
};

type Item = {
  cProd: string;
  xProd: string;
  ncm: string;
  cst: string;
  cfop: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  vBC: number;
  vICMS: number;
  vIPI: number;
  pICMS: number;
  pIPI: number;
};

function fmtDateBr(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtTimeBr(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mi}:${ss}`;
}

function freteLabel(mod: string): string {
  const map: Record<string, string> = {
    '0': '0-Emitente',
    '1': '1-Destinatário',
    '2': '2-Terceiros',
    '3': '3-Próprio remetente',
    '4': '4-Próprio destinatário',
    '9': '9-Sem frete',
  };
  return map[mod] || mod || '9-Sem frete';
}

async function barcodeChave(chave: string): Promise<Buffer | null> {
  const digits = chave.replace(/\D/g, '');
  if (digits.length !== 44) return null;
  try {
    return await bwipjs.toBuffer({
      bcid: 'code128',
      text: digits,
      scale: 2,
      height: 11,
      includetext: false,
      paddingwidth: 0,
      paddingheight: 0,
    });
  } catch {
    return null;
  }
}

/**
 * DANFE NF-e A4 retrato — leiaute conforme Manual de Orientação do Contribuinte (SEFAZ).
 */
export async function gerarDanfeNfeA4(input: NfeDanfeInput): Promise<Buffer> {
  const xml = input.xmlNfe || '';
  const emit = xmlBlock(xml, 'emit');
  const enderEmit = xmlBlock(xml, 'enderEmit') || xmlBlock(emit, 'enderEmit');
  const dest = xmlBlock(xml, 'dest');
  const enderDest = xmlBlock(xml, 'enderDest') || xmlBlock(dest, 'enderDest');
  const prot = xmlBlock(xml, 'infProt') || xmlBlock(xml, 'protNFe');
  const ide = xmlBlock(xml, 'ide');
  const total = xmlBlock(xml, 'total') || xmlBlock(xml, 'ICMSTot');
  const icmsTot = xmlBlock(xml, 'ICMSTot') || total;
  const transp = xmlBlock(xml, 'transp');
  const transporta = xmlBlock(xml, 'transporta') || xmlBlock(transp, 'transporta');
  const vol = xmlBlock(xml, 'vol') || xmlBlock(transp, 'vol');

  const emitNome = xmlTag(emit, 'xNome') || 'Emitente';
  const emitFant = xmlTag(emit, 'xFant');
  const emitCnpj = formatCnpjCpf(xmlTag(emit, 'CNPJ'));
  const emitIe = xmlTag(emit, 'IE') || '';
  const emitIeSt = xmlTag(emit, 'IEST') || '';
  const emitFone = xmlTag(enderEmit, 'fone') || '';
  const emitEnd = [
    xmlTag(enderEmit, 'xLgr'),
    xmlTag(enderEmit, 'nro'),
    xmlTag(enderEmit, 'xCpl'),
  ]
    .filter(Boolean)
    .join(', ');
  const emitBairro = xmlTag(enderEmit, 'xBairro');
  const emitMun = xmlTag(enderEmit, 'xMun');
  const emitUf = xmlTag(enderEmit, 'UF');
  const emitCep = formatCep(xmlTag(enderEmit, 'CEP'));

  const destNome = xmlTag(dest, 'xNome') || '';
  const destDoc = formatCnpjCpf(xmlTag(dest, 'CPF') || xmlTag(dest, 'CNPJ'));
  const destIe = xmlTag(dest, 'IE') || '';
  const destEnd = [
    xmlTag(enderDest, 'xLgr'),
    xmlTag(enderDest, 'nro'),
    xmlTag(enderDest, 'xCpl'),
  ]
    .filter(Boolean)
    .join(', ');
  const destBairro = xmlTag(enderDest, 'xBairro');
  const destMun = xmlTag(enderDest, 'xMun');
  const destUf = xmlTag(enderDest, 'UF');
  const destCep = formatCep(xmlTag(enderDest, 'CEP'));
  const destFone = xmlTag(enderDest, 'fone') || '';

  const items: Item[] = xmlBlocks(xml, 'det').map((det) => {
    const prod = xmlBlock(det, 'prod') || det;
    const imposto = xmlBlock(det, 'imposto') || det;
    const icmsNode =
      xmlBlock(imposto, 'ICMSSN102') ||
      xmlBlock(imposto, 'ICMSSN500') ||
      xmlBlock(imposto, 'ICMS00') ||
      xmlBlock(imposto, 'ICMS') ||
      imposto;
    const ipiNode = xmlBlock(imposto, 'IPITrib') || xmlBlock(imposto, 'IPI') || '';
    const cst =
      xmlTag(icmsNode, 'CSOSN') ||
      xmlTag(icmsNode, 'CST') ||
      xmlTag(imposto, 'CSOSN') ||
      xmlTag(imposto, 'CST') ||
      '';
    return {
      cProd: xmlTag(prod, 'cProd') || '',
      xProd: xmlTag(prod, 'xProd') || 'Item',
      ncm: xmlTag(prod, 'NCM') || '',
      cst,
      cfop: xmlTag(prod, 'CFOP') || '',
      uCom: xmlTag(prod, 'uCom') || 'UN',
      qCom: Number(xmlTag(prod, 'qCom') || 1),
      vUnCom: Number(xmlTag(prod, 'vUnCom') || 0),
      vProd: Number(xmlTag(prod, 'vProd') || 0),
      vBC: Number(xmlTag(icmsNode, 'vBC') || 0),
      vICMS: Number(xmlTag(icmsNode, 'vICMS') || 0),
      vIPI: Number(xmlTag(ipiNode, 'vIPI') || 0),
      pICMS: Number(xmlTag(icmsNode, 'pICMS') || 0),
      pIPI: Number(xmlTag(ipiNode, 'pIPI') || 0),
    };
  });

  const chave = (input.chaveAcesso || xmlTag(xml, 'chNFe') || '').replace(/\D/g, '');
  const protocolo = input.protocolo || xmlTag(prot, 'nProt') || '';
  const dhRecbto = xmlTag(prot, 'dhRecbto') || '';
  const dhEmi = input.dhEmi || xmlTag(ide, 'dhEmi') || xmlTag(xml, 'dhEmi');
  const dhSaiEnt = xmlTag(ide, 'dhSaiEnt') || dhEmi;
  const natOp = xmlTag(ide, 'natOp') || 'VENDA';
  const serie = String(input.serie || xmlTag(ide, 'serie') || '1');
  const numero = Number(input.numero || xmlTag(ide, 'nNF') || 0);
  const tpNF = xmlTag(ide, 'tpNF') || '1';
  const modFrete = xmlTag(transp, 'modFrete') || '9';
  const homolog = Number(input.tipoAmbiente) === 2 || xmlTag(ide, 'tpAmb') === '2';

  const vBC = Number(xmlTag(icmsTot, 'vBC') || 0);
  const vICMS = Number(xmlTag(icmsTot, 'vICMS') || 0);
  const vBCST = Number(xmlTag(icmsTot, 'vBCST') || 0);
  const vST = Number(xmlTag(icmsTot, 'vST') || 0);
  const vProd = Number(xmlTag(icmsTot, 'vProd') || input.valorTotal || 0);
  const vFrete = Number(xmlTag(icmsTot, 'vFrete') || 0);
  const vSeg = Number(xmlTag(icmsTot, 'vSeg') || 0);
  const vDesc = Number(xmlTag(icmsTot, 'vDesc') || 0);
  const vOutro = Number(xmlTag(icmsTot, 'vOutro') || 0);
  const vIPI = Number(xmlTag(icmsTot, 'vIPI') || 0);
  const vNF = Number(xmlTag(icmsTot, 'vNF') || input.valorTotal || 0);

  const infCpl = xmlTag(xml, 'infCpl') || '';
  const infAdFisco = xmlTag(xml, 'infAdFisco') || '';

  const list = items.length
    ? items
    : [
        {
          cProd: '',
          xProd: 'Item',
          ncm: '',
          cst: '',
          cfop: '',
          uCom: 'UN',
          qCom: 1,
          vUnCom: vNF,
          vProd: vNF,
          vBC: 0,
          vICMS: 0,
          vIPI: 0,
          pICMS: 0,
          pIPI: 0,
        },
      ];

  const barcode = await barcodeChave(chave);
  const nNFFmt = String(numero).padStart(9, '0').replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `DANFE NF-e ${numero}`,
        Author: 'Gestão Consert — DANFE NF-e A4',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const x0 = M;
    const w = PAGE_W - M * 2;
    let y = M;

    const stroke = (x: number, yy: number, ww: number, hh: number, lw = 0.6) => {
      doc.lineWidth(lw).strokeColor('#000').rect(x, yy, ww, hh).stroke();
    };
    const hline = (x: number, yy: number, ww: number, lw = 0.5) => {
      doc.lineWidth(lw).strokeColor('#000').moveTo(x, yy).lineTo(x + ww, yy).stroke();
    };
    const vline = (x: number, yy: number, hh: number, lw = 0.5) => {
      doc.lineWidth(lw).strokeColor('#000').moveTo(x, yy).lineTo(x, yy + hh).stroke();
    };
    const label = (t: string, x: number, yy: number, ww: number) => {
      doc
        .font('Helvetica')
        .fontSize(5)
        .fillColor('#000')
        .text(t.toUpperCase(), x + 1.5, yy + 1, { width: ww - 3, lineBreak: false });
    };
    const value = (
      t: string,
      x: number,
      yy: number,
      ww: number,
      opts?: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'right' }
    ) => {
      doc
        .font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(opts?.size ?? 8)
        .fillColor('#000')
        .text(t || '', x + 1.5, yy, {
          width: ww - 3,
          align: opts?.align ?? 'left',
          lineBreak: false,
        });
    };
    const cell = (
      lbl: string,
      val: string,
      x: number,
      yy: number,
      ww: number,
      hh: number,
      opts?: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'right' }
    ) => {
      stroke(x, yy, ww, hh);
      label(lbl, x, yy, ww);
      value(val, x, yy + 8, ww, opts);
    };
    const sectionTitle = (t: string, x: number, yy: number, ww: number) => {
      stroke(x, yy, ww, 10);
      doc
        .font('Helvetica-Bold')
        .fontSize(6)
        .fillColor('#000')
        .text(t.toUpperCase(), x + 2, yy + 2, { width: ww - 4, lineBreak: false });
      return yy + 10;
    };

    // ═══════════════════════════════════════════════
    // CANHOTO
    // ═══════════════════════════════════════════════
    const canH = 52;
    const canRight = 78;
    stroke(x0, y, w - canRight, canH, 0.8);
    stroke(x0 + w - canRight, y, canRight, canH, 0.8);

    doc
      .font('Helvetica')
      .fontSize(6)
      .fillColor('#000')
      .text(
        `RECEBEMOS DE ${emitNome.toUpperCase()} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO`,
        x0 + 3,
        y + 3,
        { width: w - canRight - 6, align: 'left' }
      );

    const canRowY = y + 28;
    hline(x0, canRowY, w - canRight);
    vline(x0 + 95, canRowY, canH - 28);
    label('DATA DE RECEBIMENTO', x0, canRowY, 95);
    label('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', x0 + 95, canRowY, w - canRight - 95);

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('NF-e', x0 + w - canRight, y + 4, { width: canRight, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(6.5)
      .text(`Nº ${nNFFmt}`, x0 + w - canRight + 2, y + 18, {
        width: canRight - 4,
        align: 'center',
      });
    doc.text(`Série ${serie}`, x0 + w - canRight + 2, y + 30, {
      width: canRight - 4,
      align: 'center',
    });
    y += canH + 2;

    // Linha de corte
    doc.save();
    doc
      .strokeColor('#000')
      .lineWidth(0.4)
      .dash(2, { space: 2 })
      .moveTo(x0, y + 3)
      .lineTo(x0 + w, y + 3)
      .stroke();
    doc.undash();
    doc.restore();
    doc
      .font('Helvetica')
      .fontSize(5)
      .fillColor('#000')
      .text('✂', x0 + w - 10, y - 1, { width: 10, align: 'right' });
    y += 8;

    // ═══════════════════════════════════════════════
    // CABEÇALHO: emitente | DANFE | chave/código de barras
    // ═══════════════════════════════════════════════
    const headH = 112;
    const emitW = w * 0.38;
    const danfeW = w * 0.22;
    const chaveW = w - emitW - danfeW;

    stroke(x0, y, emitW, headH, 0.8);
    stroke(x0 + emitW, y, danfeW, headH, 0.8);
    stroke(x0 + emitW + danfeW, y, chaveW, headH, 0.8);

    // Emitente
    let ey = y + 4;
    if (input.logo) {
      try {
        doc.image(input.logo, x0 + 4, y + 4, { fit: [54, 28] });
        ey = y + 34;
      } catch {
        /* ignore */
      }
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#000')
      .text(emitFant || emitNome, x0 + 4, ey, { width: emitW - 8 });
    let nameH = 10;
    if (emitFant && emitFant !== emitNome) {
      doc.font('Helvetica').fontSize(6).text(emitNome, x0 + 4, ey + 10, { width: emitW - 8 });
      nameH = 20;
    }
    const endLines = [
      emitEnd,
      [emitBairro, emitMun && emitUf ? `${emitMun} - ${emitUf}` : emitMun || emitUf]
        .filter(Boolean)
        .join(' — '),
      [emitCep ? `CEP: ${emitCep}` : '', emitFone ? `Fone: ${emitFone}` : '']
        .filter(Boolean)
        .join('  '),
      `CNPJ: ${emitCnpj}`,
      emitIe ? `IE: ${emitIe}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    doc
      .font('Helvetica')
      .fontSize(6)
      .text(endLines, x0 + 4, ey + nameH + 2, { width: emitW - 8, height: headH - (ey - y) - nameH - 6 });

    // Bloco DANFE
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('DANFE', x0 + emitW, y + 6, { width: danfeW, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(5.5)
      .text('Documento Auxiliar da\nNota Fiscal Eletrônica', x0 + emitW + 3, y + 22, {
        width: danfeW - 6,
        align: 'center',
      });
    doc
      .font('Helvetica')
      .fontSize(6.5)
      .text('0 - ENTRADA', x0 + emitW + 6, y + 48, { width: danfeW - 40 });
    doc.text('1 - SAÍDA', x0 + emitW + 6, y + 58, { width: danfeW - 40 });
    stroke(x0 + emitW + danfeW - 28, y + 48, 18, 18, 0.8);
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(tpNF === '0' ? '0' : '1', x0 + emitW + danfeW - 28, y + 52, {
        width: 18,
        align: 'center',
      });
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(`Nº ${nNFFmt}`, x0 + emitW + 2, y + 78, { width: danfeW - 4, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(7)
      .text(`SÉRIE ${serie}`, x0 + emitW + 2, y + 90, { width: danfeW - 4, align: 'center' });
    doc.text('FOLHA 1/1', x0 + emitW + 2, y + 100, { width: danfeW - 4, align: 'center' });

    // Chave + barcode
    const bx = x0 + emitW + danfeW;
    if (barcode) {
      try {
        doc.image(barcode, bx + 8, y + 4, { fit: [chaveW - 16, 28], align: 'center' });
      } catch {
        /* ignore */
      }
    }
    label('CHAVE DE ACESSO', bx, y + 34, chaveW);
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(formatChave(chave), bx + 2, y + 42, { width: chaveW - 4, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(5.5)
      .text(
        'Consulta de autenticidade no portal nacional da NF-e\nwww.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora',
        bx + 3,
        y + 56,
        { width: chaveW - 6, align: 'center' }
      );
    hline(bx, y + 78, chaveW);
    label('PROTOCOLO DE AUTORIZAÇÃO DE USO', bx, y + 78, chaveW);
    const protTxt = protocolo
      ? `${protocolo}  ${fmtDateTimeBr(dhRecbto || dhEmi)}`
      : '—';
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .text(protTxt, bx + 2, y + 90, { width: chaveW - 4, align: 'center' });

    y += headH;

    if (homolog) {
      stroke(x0, y, w, 12, 0.8);
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor('#c00')
        .text('NF-e EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL', x0, y + 2.5, {
          width: w,
          align: 'center',
        });
      doc.fillColor('#000');
      y += 12;
    }

    // Natureza + IE / IE ST / CNPJ (MOC)
    cell('NATUREZA DA OPERAÇÃO', natOp, x0, y, w, 18);
    y += 18;
    cell('INSCRIÇÃO ESTADUAL', emitIe || '', x0, y, w / 3, 18);
    cell('INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO', emitIeSt || '', x0 + w / 3, y, w / 3, 18);
    cell('CNPJ', emitCnpj, x0 + (2 * w) / 3, y, w / 3, 18);
    y += 18;

    // ═══════════════════════════════════════════════
    // DESTINATÁRIO / REMETENTE
    // ═══════════════════════════════════════════════
    y = sectionTitle('DESTINATÁRIO / REMETENTE', x0, y, w);
    cell('NOME / RAZÃO SOCIAL', destNome, x0, y, w * 0.62, 18);
    cell('CNPJ / CPF', destDoc, x0 + w * 0.62, y, w * 0.2, 18);
    cell('DATA DA EMISSÃO', fmtDateBr(dhEmi), x0 + w * 0.82, y, w * 0.18, 18);
    y += 18;
    cell('ENDEREÇO', destEnd, x0, y, w * 0.52, 18);
    cell('BAIRRO / DISTRITO', destBairro, x0 + w * 0.52, y, w * 0.28, 18);
    cell('CEP', destCep, x0 + w * 0.8, y, w * 0.2, 18);
    y += 18;
    cell('MUNICÍPIO', destMun, x0, y, w * 0.32, 18);
    cell('UF', destUf, x0 + w * 0.32, y, w * 0.05, 18, { align: 'center' });
    cell('FONE / FAX', destFone, x0 + w * 0.37, y, w * 0.16, 18);
    cell('INSCRIÇÃO ESTADUAL', destIe, x0 + w * 0.53, y, w * 0.15, 18);
    cell('DATA SAÍDA/ENTRADA', fmtDateBr(dhSaiEnt), x0 + w * 0.68, y, w * 0.16, 18);
    cell('HORA DA SAÍDA', fmtTimeBr(dhSaiEnt), x0 + w * 0.84, y, w * 0.16, 18);
    y += 18;

    // ═══════════════════════════════════════════════
    // CÁLCULO DO IMPOSTO
    // ═══════════════════════════════════════════════
    y = sectionTitle('CÁLCULO DO IMPOSTO', x0, y, w);
    const c1 = w / 5;
    cell('BASE DE CÁLCULO DO ICMS', money(vBC), x0, y, c1, 18, { align: 'right' });
    cell('VALOR DO ICMS', money(vICMS), x0 + c1, y, c1, 18, { align: 'right' });
    cell('BASE DE CÁLCULO DO ICMS ST', money(vBCST), x0 + 2 * c1, y, c1, 18, {
      align: 'right',
    });
    cell('VALOR DO ICMS ST', money(vST), x0 + 3 * c1, y, c1, 18, { align: 'right' });
    cell('VALOR TOTAL DOS PRODUTOS', money(vProd), x0 + 4 * c1, y, c1, 18, {
      align: 'right',
      bold: true,
    });
    y += 18;
    const c2 = w / 6;
    cell('VALOR DO FRETE', money(vFrete), x0, y, c2, 18, { align: 'right' });
    cell('VALOR DO SEGURO', money(vSeg), x0 + c2, y, c2, 18, { align: 'right' });
    cell('DESCONTO', money(vDesc), x0 + 2 * c2, y, c2, 18, { align: 'right' });
    cell('OUTRAS DESPESAS ACESSÓRIAS', money(vOutro), x0 + 3 * c2, y, c2, 18, {
      align: 'right',
    });
    cell('VALOR DO IPI', money(vIPI), x0 + 4 * c2, y, c2, 18, { align: 'right' });
    cell('VALOR TOTAL DA NOTA', money(vNF), x0 + 5 * c2, y, c2, 18, {
      align: 'right',
      bold: true,
      size: 9,
    });
    y += 18;

    // ═══════════════════════════════════════════════
    // TRANSPORTADOR / VOLUMES
    // ═══════════════════════════════════════════════
    y = sectionTitle('TRANSPORTADOR / VOLUMES TRANSPORTADOS', x0, y, w);
    const trNome = xmlTag(transporta, 'xNome') || '';
    const trCnpj = formatCnpjCpf(xmlTag(transporta, 'CNPJ') || xmlTag(transporta, 'CPF'));
    const trIe = xmlTag(transporta, 'IE') || '';
    const trEnd = xmlTag(transporta, 'xEnder') || '';
    const trMun = xmlTag(transporta, 'xMun') || '';
    const trUf = xmlTag(transporta, 'UF') || '';
    const placa = xmlTag(xmlBlock(transp, 'veicTransp') || transp, 'placa') || '';
    const placaUf = xmlTag(xmlBlock(transp, 'veicTransp') || transp, 'UF') || '';
    const rntc = xmlTag(xmlBlock(transp, 'veicTransp') || transp, 'RNTC') || '';

    cell('NOME / RAZÃO SOCIAL', trNome, x0, y, w * 0.42, 18);
    cell('FRETE POR CONTA', freteLabel(modFrete), x0 + w * 0.42, y, w * 0.16, 18, {
      size: 6.5,
    });
    cell('CÓDIGO ANTT', rntc, x0 + w * 0.58, y, w * 0.12, 18);
    cell('PLACA DO VEÍCULO', placa, x0 + w * 0.7, y, w * 0.12, 18);
    cell('UF', placaUf, x0 + w * 0.82, y, w * 0.05, 18, { align: 'center' });
    cell('CNPJ / CPF', trCnpj, x0 + w * 0.87, y, w * 0.13, 18, { size: 6.5 });
    y += 18;
    cell('ENDEREÇO', trEnd, x0, y, w * 0.5, 18);
    cell('MUNICÍPIO', trMun, x0 + w * 0.5, y, w * 0.28, 18);
    cell('UF', trUf, x0 + w * 0.78, y, w * 0.05, 18, { align: 'center' });
    cell('INSCRIÇÃO ESTADUAL', trIe, x0 + w * 0.83, y, w * 0.17, 18);
    y += 18;

    const qVol = xmlTag(vol, 'qVol') || '';
    const esp = xmlTag(vol, 'esp') || '';
    const marca = xmlTag(vol, 'marca') || '';
    const nVol = xmlTag(vol, 'nVol') || '';
    const pesoB = xmlTag(vol, 'pesoB') || '';
    const pesoL = xmlTag(vol, 'pesoL') || '';
    cell('QUANTIDADE', qVol, x0, y, w / 6, 18, { align: 'right' });
    cell('ESPÉCIE', esp, x0 + w / 6, y, w / 6, 18);
    cell('MARCA', marca, x0 + (2 * w) / 6, y, w / 6, 18);
    cell('NUMERAÇÃO', nVol, x0 + (3 * w) / 6, y, w / 6, 18);
    cell('PESO BRUTO', pesoB, x0 + (4 * w) / 6, y, w / 6, 18, { align: 'right' });
    cell('PESO LÍQUIDO', pesoL, x0 + (5 * w) / 6, y, w / 6, 18, { align: 'right' });
    y += 18;

    // ═══════════════════════════════════════════════
    // DADOS DOS PRODUTOS / SERVIÇOS
    // ═══════════════════════════════════════════════
    y = sectionTitle('DADOS DOS PRODUTOS / SERVIÇOS', x0, y, w);

    const cols = [
      { t: 'CÓDIGO PRODUTO', ww: 48 },
      { t: 'DESCRIÇÃO DO PRODUTO / SERVIÇO', ww: 0 }, // fill
      { t: 'NCM/SH', ww: 42 },
      { t: 'CST', ww: 26 },
      { t: 'CFOP', ww: 28 },
      { t: 'UN', ww: 18 },
      { t: 'QUANT', ww: 34 },
      { t: 'V. UNITÁRIO', ww: 46 },
      { t: 'V. TOTAL', ww: 44 },
      { t: 'BC ICMS', ww: 38 },
      { t: 'V. ICMS', ww: 36 },
      { t: 'V. IPI', ww: 32 },
      { t: 'ALÍQ. ICMS', ww: 28 },
      { t: 'ALÍQ. IPI', ww: 26 },
    ];
    const fixed = cols.reduce((s, c) => s + c.ww, 0);
    cols[1].ww = Math.max(90, w - fixed);

    const headRowH = 16;
    stroke(x0, y, w, headRowH);
    let cx = x0;
    for (const c of cols) {
      doc
        .font('Helvetica')
        .fontSize(4.5)
        .fillColor('#000')
        .text(c.t, cx + 0.8, y + 2, { width: c.ww - 1.6, align: 'center' });
      vline(cx + c.ww, y, headRowH, 0.35);
      cx += c.ww;
    }
    y += headRowH;

    const bottomReserve = 118; // ISSQN + dados adicionais
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const descLines = Math.ceil((it.xProd.length || 1) / Math.max(18, Math.floor(cols[1].ww / 4.2)));
      const rowH = Math.max(14, 6 + descLines * 7);
      if (y + rowH > PAGE_H - M - bottomReserve) break;

      stroke(x0, y, w, rowH, 0.4);
      const vals = [
        it.cProd.slice(0, 14),
        it.xProd,
        it.ncm,
        it.cst,
        it.cfop,
        it.uCom,
        fmtQty(it.qCom),
        money(it.vUnCom),
        money(it.vProd),
        money(it.vBC),
        money(it.vICMS),
        money(it.vIPI),
        it.pICMS ? money(it.pICMS) : '',
        it.pIPI ? money(it.pIPI) : '',
      ];
      cx = x0;
      vals.forEach((v, idx) => {
        const align = idx === 1 ? 'left' : idx >= 6 ? 'right' : 'center';
        doc
          .font('Helvetica')
          .fontSize(idx === 1 ? 6 : 5.5)
          .fillColor('#000')
          .text(v, cx + 0.8, y + 2.5, {
            width: cols[idx].ww - 1.6,
            align,
            height: rowH - 3.5,
          });
        vline(cx + cols[idx].ww, y, rowH, 0.3);
        cx += cols[idx].ww;
      });
      y += rowH;
    }

    // Preencher área vazia da tabela até o bloco seguinte
    const fillH = Math.max(20, PAGE_H - M - bottomReserve - y);
    if (fillH > 8) {
      stroke(x0, y, w, fillH, 0.4);
      cx = x0;
      for (const c of cols) {
        vline(cx + c.ww, y, fillH, 0.25);
        cx += c.ww;
      }
      y += fillH;
    }

    // ═══════════════════════════════════════════════
    // CÁLCULO DO ISSQN
    // ═══════════════════════════════════════════════
    y = sectionTitle('CÁLCULO DO ISSQN', x0, y, w);
    cell('INSCRIÇÃO MUNICIPAL', '', x0, y, w / 4, 18);
    cell('VALOR TOTAL DOS SERVIÇOS', '', x0 + w / 4, y, w / 4, 18, { align: 'right' });
    cell('BASE DE CÁLCULO DO ISSQN', '', x0 + w / 2, y, w / 4, 18, { align: 'right' });
    cell('VALOR DO ISSQN', '', x0 + (3 * w) / 4, y, w / 4, 18, { align: 'right' });
    y += 18;

    // ═══════════════════════════════════════════════
    // DADOS ADICIONAIS
    // ═══════════════════════════════════════════════
    const infoH = Math.max(48, PAGE_H - M - y);
    y = sectionTitle('DADOS ADICIONAIS', x0, y, w);
    const leftInfo = w * 0.62;
    stroke(x0, y, leftInfo, infoH - 10);
    stroke(x0 + leftInfo, y, w - leftInfo, infoH - 10);
    label('INFORMAÇÕES COMPLEMENTARES', x0, y, leftInfo);
    label('RESERVADO AO FISCO', x0 + leftInfo, y, w - leftInfo);

    const compl = [
      infCpl,
      protocolo ? `Protocolo de autorização: ${protocolo}` : '',
      destIe ? `IE Destinatário: ${destIe}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    doc
      .font('Helvetica')
      .fontSize(6)
      .fillColor('#000')
      .text(compl, x0 + 2, y + 10, { width: leftInfo - 4, height: infoH - 22 });
    doc.text(infAdFisco, x0 + leftInfo + 2, y + 10, {
      width: w - leftInfo - 4,
      height: infoH - 22,
    });

    doc.end();
  });
}
