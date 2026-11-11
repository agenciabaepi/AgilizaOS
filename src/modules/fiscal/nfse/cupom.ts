import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { NFSe } from 'open-nfse';
import {
  CUPOM_MARGIN,
  CUPOM_W,
  center,
  drawLogoTopo,
  estimateCupomHeight,
  formatCep,
  formatChave,
  formatCnpjCpf,
  left,
  moneyBrl,
  rodapeSistema,
  rowLR,
  sepLine,
  type CupomLogo,
} from '../cupom-termico';

function digitoDoc(id: Record<string, string> | undefined): string {
  if (!id) return '—';
  if ('CNPJ' in id) return formatCnpjCpf(id.CNPJ);
  if ('CPF' in id) return formatCnpjCpf(id.CPF);
  if ('NIF' in id) return id.NIF;
  if ('cNaoNIF' in id) return id.cNaoNIF;
  return '—';
}

function fmtDateTime(d: Date | undefined | null): string {
  if (!d || Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function fmtDate(d: Date | undefined | null): string {
  if (!d || Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Cupom fiscal térmico 80mm da NFS-e (DANFSe simplificado para impressora de bobina).
 * Mantém os elementos obrigatórios de consulta (chave + QR do portal nacional).
 */
export async function gerarCupomNfse(
  nfse: NFSe,
  opts?: { logo?: CupomLogo | null }
): Promise<Buffer> {
  const inf = nfse.infNFSe;
  const dps = inf.DPS.infDPS;
  const tpAmb = String(dps.tpAmb);
  const homolog = tpAmb === '2';

  const emit = inf.emit;
  const end = emit.enderNac;
  const toma = dps.toma;
  const serv = dps.serv;
  const descServ = serv.cServ.xDescServ || 'Serviço';
  const cTrib = `${serv.cServ.cTribNac}${serv.cServ.cTribMun ? ` / ${serv.cServ.cTribMun}` : ''}`;

  const vServ = dps.valores.vServPrest.vServ;
  const vLiq = inf.valores.vLiq;
  const vIssqn = inf.valores.vISSQN;
  const vBc = inf.valores.vBC;
  const pAliq = inf.valores.pAliqAplic;

  const urlBase = homolog
    ? 'https://www.producaorestrita.nfse.gov.br/ConsultaPublica'
    : 'https://www.nfse.gov.br/ConsultaPublica';
  const urlConsulta = `${urlBase}/?tpc=1&chave=${inf.chaveAcesso}`;

  const qrPng = await QRCode.toBuffer(urlConsulta, {
    type: 'png',
    width: 180,
    margin: 0,
    errorCorrectionLevel: 'M',
  });

  const descLines = Math.ceil(descServ.length / 36) + 1;
  const pageH = estimateCupomHeight({
    headerLines: 16 + (opts?.logo ? 5 : 0),
    itemLines: descLines + 2,
    extraLines: 36,
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
        Title: `Cupom NFS-e ${inf.nNFSe || inf.chaveAcesso}`,
        Author: 'Gestão Consert — Cupom NFS-e 80mm',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = CUPOM_MARGIN;
    y = drawLogoTopo(doc, opts?.logo, x0, y, w, { maxW: w * 0.75, maxH: 32 });

    // —— Prestador ——
    y = center(doc, (emit.xNome || 'Prestador').toUpperCase(), x0, y, w, {
      bold: true,
      size: 9,
    });
    y += 2;
    const endTxt = [
      end.xLgr,
      end.nro,
      end.xCpl,
      end.xBairro,
      inf.xLocEmi && end.UF ? `${inf.xLocEmi}/${end.UF}` : inf.xLocEmi || end.UF,
      formatCep(end.CEP),
    ]
      .filter(Boolean)
      .join(', ');
    if (endTxt) y = center(doc, endTxt, x0, y, w, { size: 6.5 });
    y = center(doc, `CNPJ: ${digitoDoc(emit.identificador as Record<string, string>)}`, x0, y, w, {
      size: 6.5,
    });
    if (emit.IM) {
      y = center(doc, `IM: ${emit.IM}`, x0, y, w, { size: 6.5 });
    }
    y += 2;
    y = sepLine(doc, x0, y, w);

    // —— Título ——
    y = center(doc, 'DANFSe', x0, y, w, { bold: true, size: 10 });
    y = center(doc, 'Documento Auxiliar da NFS-e', x0, y, w, { size: 6.5 });
    y = center(doc, 'Cupom fiscal — bobina 80mm', x0, y, w, { size: 6 });
    y += 2;

    if (homolog) {
      y = center(doc, 'NFS-e SEM VALIDADE JURÍDICA', x0, y, w, {
        bold: true,
        size: 7,
        color: '#c00',
      });
      y = center(doc, 'AMBIENTE DE HOMOLOGAÇÃO', x0, y, w, {
        bold: true,
        size: 7,
        color: '#c00',
      });
      y += 2;
    }

    y = center(doc, `NFS-e nº ${inf.nNFSe}`, x0, y, w, { bold: true, size: 8 });
    y = center(doc, `DPS nº ${dps.nDPS}  Série ${dps.serie}`, x0, y, w, { size: 7 });
    y = center(doc, `Emissão: ${fmtDateTime(inf.dhProc || dps.dhEmi)}`, x0, y, w, { size: 7 });
    y = center(doc, `Competência: ${fmtDate(dps.dCompet)}`, x0, y, w, { size: 7 });
    y += 2;
    y = sepLine(doc, x0, y, w);

    // —— Tomador ——
    y = left(doc, 'TOMADOR / ADQUIRENTE', x0, y, w, { bold: true, size: 7 });
    if (!toma) {
      y = left(doc, 'NÃO IDENTIFICADO', x0, y, w, { size: 7 });
    } else {
      y = left(doc, toma.xNome || '—', x0, y, w, { size: 7 });
      y = left(doc, `CPF/CNPJ: ${digitoDoc(toma.identificador as Record<string, string>)}`, x0, y, w, {
        size: 7,
      });
    }
    y += 2;
    y = sepLine(doc, x0, y, w);

    // —— Serviço ——
    y = left(doc, 'DISCRIMINAÇÃO DO SERVIÇO', x0, y, w, { bold: true, size: 7 });
    y = left(doc, `Cód. tributação: ${cTrib}`, x0, y, w, { size: 6.5 });
    y = left(doc, descServ, x0, y, w, { size: 7 });
    y += 2;
    y = sepLine(doc, x0, y, w);

    // —— Valores ——
    y = rowLR(doc, 'Valor do serviço', moneyBrl(vServ), x0, y, w, { size: 7 });
    if (vBc != null && !Number.isNaN(Number(vBc))) {
      y = rowLR(doc, 'Base de cálculo ISSQN', moneyBrl(Number(vBc)), x0, y, w, { size: 7 });
    }
    if (pAliq != null && !Number.isNaN(Number(pAliq))) {
      y = rowLR(
        doc,
        'Alíquota ISSQN',
        `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(pAliq))}%`,
        x0,
        y,
        w,
        { size: 7 }
      );
    }
    if (vIssqn != null && !Number.isNaN(Number(vIssqn))) {
      y = rowLR(doc, 'ISSQN', moneyBrl(Number(vIssqn)), x0, y, w, { size: 7 });
    }
    y = rowLR(doc, 'VALOR LÍQUIDO', moneyBrl(vLiq ?? vServ), x0, y, w, {
      bold: true,
      size: 8,
    });
    y += 2;
    y = sepLine(doc, x0, y, w);

    // —— Consulta ——
    y = center(doc, 'Consulte pela Chave de Acesso em', x0, y, w, { size: 6.5 });
    y = center(doc, homolog ? 'producaorestrita.nfse.gov.br' : 'www.nfse.gov.br', x0, y, w, {
      bold: true,
      size: 6.5,
    });
    y += 2;
    y = center(doc, 'CHAVE DE ACESSO', x0, y, w, { bold: true, size: 7 });
    y = center(doc, formatChave(inf.chaveAcesso), x0, y, w, { size: 6.5 });
    y += 4;

    const qrSize = 88;
    doc.image(qrPng, x0 + (w - qrSize) / 2, y, { width: qrSize, height: qrSize });
    y += qrSize + 6;

    y = sepLine(doc, x0, y, w);
    y = center(doc, 'A autenticidade desta NFS-e pode ser', x0, y, w, { size: 5.5 });
    y = center(doc, 'verificada pela chave ou pelo QR Code', x0, y, w, { size: 5.5 });
    y += 2;
    y = rodapeSistema(doc, x0, y, w);

    doc.end();
  });
}
