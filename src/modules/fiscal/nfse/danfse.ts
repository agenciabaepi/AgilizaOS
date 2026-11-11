import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { NFSe } from 'open-nfse';
import { Ambiente } from 'open-nfse';

/** DANFSe v2.0 — leiaute NT 008/2026 (Anexo I). */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 5.67; // ~2 mm (faixa 0,15–0,20 cm da NT)
const GRAY = '#f2f2f2'; // ~5% K
const BLACK = '#000000';
const RED = '#FF0000';
const BORDER = 1;
const LINE = 0.5;

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'public/fiscal/logo-nfse-horizontal.png'),
    path.join(process.cwd(), 'src/modules/fiscal/nfse/assets/logo-nfse-horizontal.png'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const AMB_GER: Record<string, string> = {
  '1': 'Sistema Próprio do Município',
  '2': 'Sefin Nacional NFS-e',
};
const TP_AMB: Record<string, string> = {
  '1': 'Produção',
  '2': 'Homologação',
};
const TP_EMIT: Record<string, string> = {
  '1': 'Prestador',
  '2': 'Tomador',
  '3': 'Intermediário',
};
const C_STAT: Record<string, string> = {
  '100': 'NFS-e Gerada',
  '101': 'NFS-e de Substituição Gerada',
  '102': 'NFS-e de Decisão Judicial ou Administrativa',
  '103': 'NFS-e Avulsa',
  '107': 'NFS-e MEI',
};
const FIN_NFSE: Record<string, string> = {
  '0': 'NFS-e regular',
  '1': 'NFS-e de crédito',
  '2': 'NFS-e de débito',
};
const TRIB_ISSQN: Record<string, string> = {
  '1': 'Operação Tributável',
  '2': 'Imunidade',
  '3': 'Exportação de serviço',
  '4': 'Não Incidência',
};
const TP_RET_ISSQN: Record<string, string> = {
  '1': 'Não Retido',
  '2': 'Retido pelo Tomador',
  '3': 'Retido pelo Intermediário',
};
const SIMPLES_OP: Record<string, string> = {
  '1': 'Não Optante',
  '2': 'Optante - Microempreendedor Individual (MEI)',
  '3': 'Optante - Microempresa ou Empresa de Pequeno Porte (ME/EPP)',
};
const REG_AP_TRIB_SN: Record<string, string> = {
  '1': 'Regime de apuração dos tributos federais e municipal pelo Simples Nacional',
  '2':
    'Regime de apuração dos tributos federais pelo SN e o ISSQN pela NFS-e conforme respectiva legislação municipal do tributo',
  '3':
    'Regime de apuração dos tributos federais e municipal pela NFS-e conforme respectivas legislações federal e municipal de cada tributo',
};

type Doc = PDFKit.PDFDocument;

function ellipsize(text: string, limit: number): string {
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function formatChave(chave: string): string {
  return chave.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') ?? chave;
}

function formatCnpjCpf(value: string): string {
  const d = value.replace(/\D/g, '');
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  return value || '—';
}

function formatCep(cep: string): string {
  const d = (cep || '').replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}-${d.slice(5)}`;
  return cep || '—';
}

function money(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n);
}

function percent(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}%`;
}

function fmtDate(d: Date | undefined | null): string {
  if (!d || Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

function digitoDoc(id: Record<string, string> | undefined): string {
  if (!id) return '—';
  if ('CNPJ' in id) return formatCnpjCpf(id.CNPJ);
  if ('CPF' in id) return formatCnpjCpf(id.CPF);
  if ('NIF' in id) return id.NIF;
  if ('cNaoNIF' in id) return id.cNaoNIF;
  return '—';
}

function contentW(): number {
  return PAGE_W - MARGIN * 2;
}

function drawOuterBorder(doc: Doc) {
  doc
    .lineWidth(BORDER)
    .strokeColor(BLACK)
    .rect(MARGIN, MARGIN, contentW(), PAGE_H - MARGIN * 2)
    .stroke();
}

function fillRect(doc: Doc, x: number, y: number, w: number, h: number, color = GRAY) {
  doc.save();
  doc.rect(x, y, w, h).fill(color);
  doc.restore();
}

function strokeRect(doc: Doc, x: number, y: number, w: number, h: number) {
  doc.lineWidth(LINE).strokeColor(BLACK).rect(x, y, w, h).stroke();
}

function blockTitle(doc: Doc, title: string, x: number, y: number, w: number, h = 12) {
  fillRect(doc, x, y, w, h);
  strokeRect(doc, x, y, w, h);
  doc
    .fillColor(BLACK)
    .font('Helvetica-Bold')
    .fontSize(7)
    .text(title.toUpperCase(), x + 2, y + 2.5, { width: w - 4, lineBreak: false });
  return y + h;
}

function cell(
  doc: Doc,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { labelUpper?: boolean; shade?: boolean; valueBold?: boolean; valueSize?: number }
) {
  if (opts?.shade) fillRect(doc, x, y, w, h);
  strokeRect(doc, x, y, w, h);
  const labelText = opts?.labelUpper
    ? label.toUpperCase()
    : label.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
  doc
    .fillColor(BLACK)
    .font('Helvetica-Bold')
    .fontSize(opts?.labelUpper ? 7 : 6)
    .text(labelText, x + 2, y + 1.5, { width: w - 4, lineBreak: false });
  doc
    .font(opts?.valueBold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts?.valueSize ?? 7)
    .text(value || '—', x + 2, y + 9, {
      width: w - 4,
      height: h - 11,
      ellipsis: true,
    });
}

function multilineCell(
  doc: Doc,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  strokeRect(doc, x, y, w, h);
  doc
    .fillColor(BLACK)
    .font('Helvetica-Bold')
    .fontSize(6)
    .text(label, x + 2, y + 1.5, { width: w - 4, lineBreak: false });
  doc
    .font('Helvetica')
    .fontSize(7)
    .text(value || '—', x + 2, y + 9, { width: w - 4, height: h - 11 });
}

function singleLineNotice(doc: Doc, text: string, x: number, y: number, w: number, h = 14) {
  strokeRect(doc, x, y, w, h);
  doc
    .fillColor(BLACK)
    .font('Helvetica-Bold')
    .fontSize(7)
    .text(text, x + 2, y + (h - 7) / 2, {
      width: w - 4,
      align: 'center',
      lineBreak: false,
    });
  return y + h;
}

/**
 * Gera PDF do DANFSe no modelo nacional v2.0 (NT 008/2026).
 */
export async function gerarDanfseNacional(
  nfse: NFSe,
  options?: { ambiente?: Ambiente; logoEmpresa?: string | Buffer | null }
): Promise<Buffer> {
  const inf = nfse.infNFSe;
  const dps = inf.DPS.infDPS;
  // tpAmb do XML é a fonte oficial (NT 008 §2.4.3)
  const tpAmb = String(dps.tpAmb);
  const homolog = tpAmb === '2';
  void options?.ambiente;

  const urlBase = homolog
    ? 'https://www.producaorestrita.nfse.gov.br/ConsultaPublica'
    : 'https://www.nfse.gov.br/ConsultaPublica';
  const urlConsulta = `${urlBase}/?tpc=1&chave=${inf.chaveAcesso}`;

  const qrPng = await QRCode.toBuffer(urlConsulta, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 180,
  });

  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `DANFSe ${inf.nNFSe || inf.chaveAcesso}`,
        Author: 'Gestão Consert — DANFSe v2.0 (NT 008/2026)',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      const x0 = MARGIN;
      const w = contentW();
      let y = MARGIN;

      drawOuterBorder(doc);

      // —— Cabeçalho ——
      const headerH = homolog ? 42 : 33;
      fillRect(doc, x0, y, w, headerH);
      strokeRect(doc, x0, y, w, headerH);

      const logoW = 95;
      const logoH = 19;
      const logoEmpresa = options?.logoEmpresa;
      const logoPath = resolveLogoPath();
      let logoDrawn = false;
      if (logoEmpresa) {
        try {
          doc.image(logoEmpresa, x0 + 6, y + 5, { fit: [logoW, logoH + 4] });
          logoDrawn = true;
        } catch {
          /* tenta logo oficial abaixo */
        }
      }
      if (!logoDrawn && logoPath) {
        try {
          doc.image(logoPath, x0 + 6, y + 7, { width: logoW, height: logoH });
          logoDrawn = true;
        } catch {
          /* fallback texto */
        }
      }
      if (!logoDrawn) {
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(BLACK)
          .text('NFS-e', x0 + 8, y + 12);
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(BLACK)
        .text('DANFSe v2.0', x0 + 120, y + 8, { width: 220, align: 'center' });
      doc.text('Documento Auxiliar da NFS-e', x0 + 120, y + 19, {
        width: 220,
        align: 'center',
      });

      if (homolog) {
        doc
          .fillColor(RED)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('NFS-e SEM VALIDADE JURÍDICA', x0 + 120, y + 30, {
            width: 220,
            align: 'center',
          });
        doc.fillColor(BLACK);
      }

      const rightX = x0 + w - 144;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(BLACK)
        .text(`Município: ${inf.xLocEmi || '—'}`, rightX, y + 4, {
          width: 140,
          align: 'right',
        });
      doc
        .fontSize(6)
        .text(`Ambiente Gerador: ${AMB_GER[String(inf.ambGer)] || inf.ambGer}`, rightX, y + 15, {
          width: 140,
          align: 'right',
        });
      doc.text(
        `Tipo de Ambiente: ${TP_AMB[String(dps.tpAmb)] || dps.tpAmb}`,
        rightX,
        y + 23,
        { width: 140, align: 'right' }
      );

      y += headerH;

      // —— Identificação + QR ——
      const idH = 80;
      const qrBox = 43; // ~1,52 cm
      const leftIdW = w - 144;

      // Chave
      cell(
        doc,
        'Chave de Acesso da NFS-e',
        formatChave(inf.chaveAcesso),
        x0,
        y,
        leftIdW,
        22,
        { labelUpper: true }
      );

      // QR + texto
      strokeRect(doc, x0 + leftIdW, y, 144, idH);
      doc.image(qrPng, x0 + leftIdW + (144 - qrBox) / 2, y + 3, {
        width: qrBox,
        height: qrBox,
      });
      doc
        .font('Helvetica')
        .fontSize(5.5)
        .fillColor(BLACK)
        .text(
          'A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e',
          x0 + leftIdW + 3,
          y + 48,
          { width: 138, align: 'center' }
        );

      // Linha 2 identificação
      const row2Y = y + 22;
      const col = leftIdW / 3;
      cell(doc, 'Número da NFS-e', String(inf.nNFSe), x0, row2Y, col, 19, {
        labelUpper: true,
      });
      cell(
        doc,
        'Competência da NFS-e',
        fmtDate(dps.dCompet),
        x0 + col,
        row2Y,
        col,
        19,
        { labelUpper: true }
      );
      cell(
        doc,
        'Data e Hora da Emissão da NFS-e',
        fmtDateTime(inf.dhProc),
        x0 + col * 2,
        row2Y,
        col,
        19,
        { labelUpper: true }
      );

      // Linha 3
      const row3Y = row2Y + 19;
      cell(doc, 'Número da DPS', String(dps.nDPS), x0, row3Y, col, 19, {
        labelUpper: true,
      });
      cell(doc, 'Série da DPS', String(dps.serie), x0 + col, row3Y, col, 19, {
        labelUpper: true,
      });
      cell(
        doc,
        'Data e Hora da Emissão da DPS',
        fmtDateTime(dps.dhEmi),
        x0 + col * 2,
        row3Y,
        col,
        19,
        { labelUpper: true }
      );

      // Linha 4
      const row4Y = row3Y + 19;
      cell(
        doc,
        'Emitente da NFS-e',
        TP_EMIT[String(dps.tpEmit)] || String(dps.tpEmit),
        x0,
        row4Y,
        col,
        20,
        { labelUpper: true, shade: true }
      );
      cell(
        doc,
        'Situação da NFS-e',
        ellipsize(C_STAT[String(inf.cStat)] || String(inf.cStat), 37),
        x0 + col,
        row4Y,
        col,
        20,
        { labelUpper: true }
      );
      const finNFSe = String((dps as { finNFSe?: string | number }).finNFSe ?? '0');
      cell(
        doc,
        'Finalidade',
        ellipsize(FIN_NFSE[finNFSe] || finNFSe, 37),
        x0 + col * 2,
        row4Y,
        col,
        20,
        { labelUpper: true }
      );

      y += idH;

      // —— Prestador ——
      const emit = inf.emit;
      const end = emit.enderNac;
      y = blockTitle(doc, 'Prestador / Fornecedor', x0, y, w);

      const pRow1 = 18;
      cell(doc, 'CNPJ / CPF / NIF', digitoDoc(emit.identificador as any), x0, y, w * 0.34, pRow1);
      cell(
        doc,
        'Indicador Municipal (Inscrição)',
        emit.IM || '—',
        x0 + w * 0.34,
        y,
        w * 0.33,
        pRow1
      );
      cell(
        doc,
        'Telefone',
        (emit as { fone?: string }).fone || '—',
        x0 + w * 0.67,
        y,
        w * 0.33,
        pRow1
      );
      y += pRow1;

      cell(
        doc,
        'Nome / Nome Empresarial',
        ellipsize(emit.xNome, 80),
        x0,
        y,
        w * 0.5,
        pRow1
      );
      cell(
        doc,
        'Município / Sigla UF',
        `${inf.xLocEmi || '—'} / ${end.UF}`,
        x0 + w * 0.5,
        y,
        w * 0.25,
        pRow1
      );
      cell(
        doc,
        'Código IBGE / CEP',
        `${dps.cLocEmi || '—'} / ${formatCep(end.CEP)}`,
        x0 + w * 0.75,
        y,
        w * 0.25,
        pRow1
      );
      y += pRow1;

      const endTxt = `${end.xLgr}, ${end.nro}${end.xCpl ? `, ${end.xCpl}` : ''}, ${end.xBairro}`;
      cell(doc, 'Endereço', ellipsize(endTxt, 120), x0, y, w * 0.62, pRow1);
      cell(doc, 'E-mail', emit.email || '—', x0 + w * 0.62, y, w * 0.38, pRow1);
      y += pRow1;

      const prest = dps.prest as {
        regTrib?: { opSimpNac?: string; regApTribSN?: string };
      };
      const opSimp = prest.regTrib?.opSimpNac;
      const regSn = prest.regTrib?.regApTribSN;
      cell(
        doc,
        'Simples Nacional na Data de Competência',
        ellipsize(SIMPLES_OP[String(opSimp)] || '—', 70),
        x0,
        y,
        w * 0.5,
        pRow1
      );
      cell(
        doc,
        'Regime de Apuração Tributária pelo SN',
        ellipsize(REG_AP_TRIB_SN[String(regSn)] || '—', 70),
        x0 + w * 0.5,
        y,
        w * 0.5,
        pRow1
      );
      y += pRow1;

      // —— Tomador ——
      y = blockTitle(doc, 'Tomador / Adquirente', x0, y, w);
      const toma = dps.toma;
      if (!toma) {
        y = singleLineNotice(
          doc,
          'TOMADOR/ADQUIRENTE DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e',
          x0,
          y,
          w
        );
      } else {
        cell(doc, 'CNPJ / CPF / NIF', digitoDoc(toma.identificador as any), x0, y, w * 0.34, pRow1);
        cell(
          doc,
          'Indicador Municipal (Inscrição)',
          (toma as { IM?: string }).IM || '—',
          x0 + w * 0.34,
          y,
          w * 0.33,
          pRow1
        );
        cell(
          doc,
          'Telefone',
          (toma as { fone?: string }).fone || '—',
          x0 + w * 0.67,
          y,
          w * 0.33,
          pRow1
        );
        y += pRow1;
        cell(
          doc,
          'Nome / Nome Empresarial',
          ellipsize(toma.xNome || '—', 80),
          x0,
          y,
          w * 0.5,
          pRow1
        );
        let munToma = '—';
        let cepToma = '—';
        let endToma = '—';
        if (toma.end) {
          const te = toma.end;
          endToma = `${te.xLgr}, ${te.nro}${te.xCpl ? `, ${te.xCpl}` : ''}, ${te.xBairro}`;
          if ('endNac' in te.localidade) {
            const en = te.localidade.endNac;
            cepToma = formatCep(en.CEP);
            munToma = en.cMun || '—';
          }
        }
        cell(doc, 'Município / Sigla UF', munToma, x0 + w * 0.5, y, w * 0.25, pRow1);
        cell(doc, 'Código IBGE / CEP', `${munToma} / ${cepToma}`, x0 + w * 0.75, y, w * 0.25, pRow1);
        y += pRow1;
        cell(doc, 'Endereço', ellipsize(endToma, 120), x0, y, w * 0.62, pRow1);
        cell(
          doc,
          'E-mail',
          (toma as { email?: string }).email || '—',
          x0 + w * 0.62,
          y,
          w * 0.38,
          pRow1
        );
        y += pRow1;
      }

      // —— Destinatário / Intermediário (supressões oficiais) ——
      y = blockTitle(doc, 'Destinatário da Operação', x0, y, w);
      y = singleLineNotice(
        doc,
        'O DESTINATÁRIO É O PRÓPRIO TOMADOR/ADQUIRENTE DA OPERAÇÃO',
        x0,
        y,
        w
      );

      y = blockTitle(doc, 'Intermediário da Operação', x0, y, w);
      if (!dps.interm) {
        y = singleLineNotice(
          doc,
          'INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e',
          x0,
          y,
          w
        );
      }

      // —— Serviço ——
      const serv = dps.serv;
      y = blockTitle(doc, 'Serviço Prestado', x0, y, w);
      cell(
        doc,
        'Código de Tributação Nacional / Municipal',
        `${serv.cServ.cTribNac}${serv.cServ.cTribMun ? ` / ${serv.cServ.cTribMun}` : ' / —'}`,
        x0,
        y,
        w * 0.4,
        pRow1
      );
      cell(doc, 'Código da NBS', serv.cServ.cNBS || '—', x0 + w * 0.4, y, w * 0.25, pRow1);
      cell(
        doc,
        'Local da Prestação / Sigla UF / País',
        ellipsize(inf.xLocPrestacao || inf.xLocIncid || '—', 40),
        x0 + w * 0.65,
        y,
        w * 0.35,
        pRow1
      );
      y += pRow1;
      cell(
        doc,
        'Descrição do Código de Tributação Nacional / Municipal',
        ellipsize(inf.xTribMun || inf.xTribNac || '—', 120),
        x0,
        y,
        w,
        pRow1
      );
      y += pRow1;
      const descH = 46;
      multilineCell(
        doc,
        'Descrição do Serviço',
        serv.cServ.xDescServ || '—',
        x0,
        y,
        w,
        descH
      );
      y += descH;

      // —— ISSQN ——
      const tribMun = dps.valores.trib.tribMun as {
        tribISSQN?: string;
        tpRetISSQN?: string;
        pAliq?: number;
      };
      const temIssqn = Boolean(tribMun?.tribISSQN);
      y = blockTitle(doc, 'Tributação Municipal (ISSQN)', x0, y, w);
      if (!temIssqn) {
        y = singleLineNotice(
          doc,
          'TRIBUTAÇÃO MUNICIPAL (ISSQN) - OPERAÇÃO NÃO SUJEITA AO ISSQN',
          x0,
          y,
          w
        );
      } else {
        cell(
          doc,
          'Tipo de Tributação do ISSQN',
          TRIB_ISSQN[String(tribMun.tribISSQN)] || String(tribMun.tribISSQN),
          x0,
          y,
          w * 0.5,
          pRow1
        );
        cell(
          doc,
          'Município / Sigla UF / País de Incidência do ISSQN',
          ellipsize(inf.xLocIncid || inf.xLocPrestacao || '—', 50),
          x0 + w * 0.5,
          y,
          w * 0.5,
          pRow1
        );
        y += pRow1;
        cell(doc, 'BC ISSQN', money(inf.valores.vBC), x0, y, w * 0.25, pRow1);
        cell(
          doc,
          'Alíquota Aplicada',
          percent(inf.valores.pAliqAplic ?? tribMun.pAliq),
          x0 + w * 0.25,
          y,
          w * 0.25,
          pRow1
        );
        cell(
          doc,
          'Retenção do ISSQN',
          TP_RET_ISSQN[String(tribMun.tpRetISSQN)] || '—',
          x0 + w * 0.5,
          y,
          w * 0.25,
          pRow1
        );
        cell(doc, 'ISSQN Apurado', money(inf.valores.vISSQN), x0 + w * 0.75, y, w * 0.25, pRow1);
        y += pRow1;
      }

      // —— Federal ——
      const tribFed = (dps.valores.trib as { tribFed?: Record<string, number | undefined> })
        .tribFed;
      y = blockTitle(doc, 'Tributação Federal (Exceto CBS)', x0, y, w);
      cell(doc, 'IRRF', money(tribFed?.vRetIRRF as number | undefined), x0, y, w / 3, pRow1);
      cell(
        doc,
        'Contribuição Previdenciária — Retida',
        money(tribFed?.vRetCP as number | undefined),
        x0 + w / 3,
        y,
        w / 3,
        pRow1
      );
      cell(
        doc,
        'Contribuições Sociais — Retidas',
        money(tribFed?.vRetCSLL as number | undefined),
        x0 + (2 * w) / 3,
        y,
        w / 3,
        pRow1
      );
      y += pRow1;
      // Linha PIS/COFINS até 2026 (Nota 6)
      if (dps.dCompet.getFullYear() <= 2026) {
        cell(
          doc,
          'PIS — Débito Apuração Própria',
          money(tribFed?.vPIS as number | undefined),
          x0,
          y,
          w / 3,
          pRow1
        );
        cell(
          doc,
          'COFINS — Débito Apuração Própria',
          money(tribFed?.vCOFINS as number | undefined),
          x0 + w / 3,
          y,
          w / 3,
          pRow1
        );
        cell(doc, 'Descrição das Contribuições Sociais — Retidas', '—', x0 + (2 * w) / 3, y, w / 3, pRow1);
        y += pRow1;
      }

      // —— IBS/CBS ——
      const ibs = inf.IBSCBS;
      y = blockTitle(doc, 'Tributação IBS / CBS', x0, y, w);
      if (!ibs) {
        y = singleLineNotice(doc, 'TRIBUTAÇÃO IBS/CBS NÃO INFORMADA NA NFS-e', x0, y, w);
      } else {
        const infoIbs = dps.IBSCBS;
        cell(
          doc,
          'CST / cClassTrib',
          `${(infoIbs as any)?.valores?.trib?.CST ?? '—'} / ${(infoIbs as any)?.valores?.trib?.cClassTrib ?? '—'}`,
          x0,
          y,
          w * 0.35,
          pRow1
        );
        cell(
          doc,
          'Indicador de Operação / Código IBGE / Município / UF',
          ellipsize(
            `${(infoIbs as any)?.cIndOp ?? '—'} / ${ibs.cLocalidadeIncid ?? '—'} / ${ibs.xLocalidadeIncid ?? '—'}`,
            50
          ),
          x0 + w * 0.35,
          y,
          w * 0.65,
          pRow1
        );
        y += pRow1;
        cell(
          doc,
          'Valor Total Apurado — IBS',
          money(ibs.totCIBS.gIBS?.vIBSTot),
          x0,
          y,
          w * 0.33,
          pRow1
        );
        cell(doc, 'Valor Total Apurado — CBS', money(ibs.totCIBS.gCBS?.vCBS), x0 + w * 0.33, y, w * 0.33, pRow1);
        cell(doc, 'Valor Total NF', money(ibs.totCIBS.vTotNF), x0 + w * 0.66, y, w * 0.34, pRow1);
        y += pRow1;
      }

      // —— Valor total ——
      const vServ = dps.valores.vServPrest.vServ;
      const descIncond = (dps.valores as { vDescIncond?: number }).vDescIncond;
      const descCond = (dps.valores as { vDescCond?: number }).vDescCond;
      const totIbsCbs =
        (ibs?.totCIBS.gIBS?.vIBSTot ?? 0) + (ibs?.totCIBS.gCBS?.vCBS ?? 0) || undefined;
      const vTotNf = ibs?.totCIBS.vTotNF ?? inf.valores.vLiq;

      y = blockTitle(doc, 'Valor Total da NFS-e', x0, y, w);
      cell(doc, 'Valor da Operação / Serviço', money(vServ), x0, y, w / 3, pRow1);
      cell(doc, 'Desconto Incondicionado', money(descIncond), x0 + w / 3, y, w / 3, pRow1);
      cell(doc, 'Desconto Condicionado', money(descCond), x0 + (2 * w) / 3, y, w / 3, pRow1);
      y += pRow1;
      cell(
        doc,
        'Total das Retenções (ISSQN / Federais)',
        money(inf.valores.vTotalRet),
        x0,
        y,
        w * 0.28,
        pRow1
      );
      cell(doc, 'Valor Líquido da NFS-e', money(inf.valores.vLiq), x0 + w * 0.28, y, w * 0.24, pRow1);
      cell(doc, 'Total do IBS/CBS', money(totIbsCbs), x0 + w * 0.52, y, w * 0.2, pRow1);
      cell(
        doc,
        'Valor Líquido da NFS-e + IBS/CBS',
        money(vTotNf),
        x0 + w * 0.72,
        y,
        w * 0.28,
        pRow1,
        { shade: true, valueBold: true }
      );
      y += pRow1;

      // —— Informações complementares ——
      const infoParts: string[] = [];
      if (inf.xOutInf) infoParts.push(inf.xOutInf);
      if (inf.xNBS) infoParts.push(`NBS: ${inf.xNBS}`);
      infoParts.push(
        'Totais aproximados dos tributos conforme Lei nº 12.741/2012: consultar o XML da NFS-e.'
      );
      const infoH = Math.max(28, PAGE_H - MARGIN - y - 2);
      y = blockTitle(doc, 'Informações Complementares', x0, y, w);
      multilineCell(doc, '', ellipsize(infoParts.join(' | '), 1997), x0, y, w, infoH);

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
