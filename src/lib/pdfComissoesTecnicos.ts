/**
 * PDF do relatório de comissões dos técnicos (jsPDF, paisagem).
 * Usado pela página /financeiro/comissoes-tecnicos.
 */
import { jsPDF } from 'jspdf';

/** Margens laterais menores para aproveitar melhor a folha A4 paisagem */
const M = 8;
const PAGE_W = 297;
const PAGE_H = 210;
const FOOTER_PAGE_Y = 200;
const LEFT = M;
const RIGHT = PAGE_W - M;
const USABLE_W = RIGHT - LEFT;

/** Azul alinhado ao tema da área financeira (tailwind blue-600) */
const BRAND = { r: 37, g: 99, b: 235 };
const SLATE = { r: 30, g: 41, b: 59 };
const MUTED = { r: 100, g: 116, b: 139 };
const ZEBRA = { r: 248, g: 250, b: 252 };

export interface ComissaoRelatorioRow {
  tecnico_nome: string;
  numero_os: string;
  cliente_nome: string;
  servico_nome: string;
  data_entrega: string;
  valor_total: number;
  tipo_comissao: 'porcentagem' | 'fixo';
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  valor_comissao: number;
  status: string;
  status_os?: string | null;
}

export interface ComissoesTecnicosPDFOptions {
  periodoLabel: string;
  filtrosLinhas: string[];
  comissoes: ComissaoRelatorioRow[];
  formatCurrency: (n: number) => string;
  formatDate: (s: string) => string;
  detalheTecnicoNome?: string;
  notaRodape?: string;
  empresaNome?: string;
  logoUrl?: string | null;
  cnpj?: string | null;
  /** Inclui linha de total + área para assinatura manual do técnico (recomendado no PDF de detalhe). */
  incluirAssinaturaTecnico?: boolean;
  /** Nome no bloco de assinatura quando não é PDF de detalhe (ex.: lista filtrada por um técnico). */
  nomeParaAssinatura?: string;
}

function ellipsize(s: string, maxChars: number): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}

/** Estima quantos caracteres cabem na largura (mm) com fonte ~6.5pt */
function charsForWidthMm(widthMm: number): number {
  return Math.max(6, Math.floor(widthMm * 2.15));
}

function loadLogoAsPngDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const done = (v: { dataUrl: string; w: number; h: number } | null) => resolve(v);
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          done(null);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          done(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        done({ dataUrl, w, h });
      } catch {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = url;
  });
}

function drawFooter(doc: jsPDF, pageIndex: number, totalPages: number) {
  doc.setFontSize(7);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(`Página ${pageIndex + 1} de ${totalPages}`, PAGE_W / 2, FOOTER_PAGE_Y, { align: 'center' });
}

function drawStatBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string
) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'S');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(label, x + 2.5, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
  const lines = doc.splitTextToSize(value, w - 5);
  doc.text(lines, x + 2.5, y + 10);
  doc.setFont('helvetica', 'normal');
}

/** Distribui colunas em frações da largura útil (soma = 1). */
function columnLayout(modoDetalhe: boolean): { xs: number[]; widths: number[] } {
  const ratios = modoDetalhe
    ? [0.05, 0.17, 0.26, 0.085, 0.1, 0.045, 0.085, 0.105, 0.075, 0.08]
    : [0.11, 0.045, 0.15, 0.22, 0.08, 0.095, 0.04, 0.075, 0.095, 0.055, 0.045];
  const sum = ratios.reduce((a, b) => a + b, 0);
  const widths = ratios.map((r) => (r / sum) * USABLE_W);
  const xs: number[] = [];
  let x = LEFT;
  for (const cw of widths) {
    xs.push(x);
    x += cw;
  }
  return { xs, widths };
}

function drawSignatureBlock(
  doc: jsPDF,
  yStart: number,
  nomeTecnico: string,
  formatCurrency: (n: number) => string,
  totalComissao: number
) {
  let y = yStart + 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(LEFT, y, RIGHT, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
  doc.text(`Total do período (soma das comissões): ${formatCurrency(totalComissao)}`, RIGHT, y, { align: 'right' });
  y += 12;

  const sigW = Math.min(88, USABLE_W * 0.38);
  const sigX = RIGHT - sigW;

  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.25);
  doc.line(sigX, y + 14, RIGHT, y + 14);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text('Assinatura do técnico', sigX, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
  const nomeLines = doc.splitTextToSize(nomeTecnico, sigW);
  doc.text(nomeLines, sigX, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text('Data: _____ / _____ / __________', sigX, y + 23 + nomeLines.length * 4.5 + 2);
}

export async function buildComissoesTecnicosPDFBlob(options: ComissoesTecnicosPDFOptions): Promise<Blob> {
  const {
    periodoLabel,
    filtrosLinhas,
    comissoes,
    formatCurrency,
    formatDate,
    detalheTecnicoNome,
    notaRodape = 'Valores conforme filtros e aba de mês ativos na tela.',
    empresaNome,
    logoUrl,
    cnpj,
    incluirAssinaturaTecnico = false,
    nomeParaAssinatura,
  } = options;

  const modoDetalhe = Boolean(detalheTecnicoNome?.trim());
  const { xs, widths } = columnLayout(modoDetalhe);

  const st = (s: string | undefined) => (s || '').toUpperCase();
  const totalValor = comissoes.reduce((a, c) => a + (c.valor_comissao || 0), 0);
  const totalPago = comissoes.filter((c) => st(c.status) === 'PAGA').reduce((a, c) => a + (c.valor_comissao || 0), 0);
  const totalCalc = comissoes
    .filter((c) => st(c.status) === 'CALCULADA')
    .reduce((a, c) => a + (c.valor_comissao || 0), 0);

  let logo: { dataUrl: string; drawW: number; drawH: number } | null = null;
  if (logoUrl?.trim() && typeof document !== 'undefined') {
    const loaded = await loadLogoAsPngDataUrl(logoUrl.trim());
    if (loaded) {
      const maxW = 34;
      const maxH = 15;
      const pxToMm = 0.264583;
      const imgWmm = loaded.w * pxToMm;
      const imgHmm = loaded.h * pxToMm;
      const scale = Math.min(maxW / imgWmm, maxH / imgHmm, 1);
      logo = {
        dataUrl: loaded.dataUrl,
        drawW: imgWmm * scale,
        drawH: imgHmm * scale,
      };
    }
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const drawTableHeader = (y: number) => {
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(LEFT, y - 4, USABLE_W, 7, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const labels = modoDetalhe
      ? ['OS', 'Cliente', 'Serviço', 'Entrega', 'V.Total', 'Tipo', '% / Fixo', 'Comissão', 'Status', 'St.OS']
      : ['Técnico', 'OS', 'Cliente', 'Serviço', 'Entrega', 'V.Total', 'Tipo', '% / Fixo', 'Comissão', 'Status', 'St.OS'];
    for (let i = 0; i < labels.length; i++) {
      doc.text(labels[i], xs[i] + 0.6, y);
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    return y + 8;
  };

  let y = M;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(LEFT, y, USABLE_W, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.roundedRect(LEFT, y, USABLE_W, 22, 2, 2, 'S');

  const headerMidY = y + 11;
  let textLeft = LEFT + 4;
  if (logo) {
    try {
      const logoX = LEFT + 4;
      const logoY = y + 4;
      doc.addImage(logo.dataUrl, 'PNG', logoX, logoY, logo.drawW, logo.drawH);
      textLeft = logoX + logo.drawW + 5;
    } catch {
      logo = null;
      textLeft = LEFT + 4;
    }
  }

  const nomeEmpresa = (empresaNome || '').trim() || 'Relatório interno';
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
  doc.text(nomeEmpresa, textLeft, headerMidY - 3);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const tituloRelatorio = modoDetalhe ? 'Comissões — detalhe do técnico' : 'Comissões dos técnicos';
  doc.text(tituloRelatorio, textLeft, headerMidY + 2);
  if (cnpj?.trim()) {
    doc.setFontSize(7.5);
    doc.text(`CNPJ: ${cnpj.trim()}`, textLeft, headerMidY + 6.5);
  }

  y += 24;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(LEFT, y, USABLE_W, 2.2, 'F');
  y += 5;

  if (modoDetalhe) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text(`Técnico: ${detalheTecnicoNome}`, LEFT, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
  doc.text(`Período (data de entrega): ${periodoLabel}`, LEFT, y);
  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  for (const line of filtrosLinhas) {
    doc.text(line, LEFT, y);
    y += 3.8;
  }
  y += 2;

  const boxGap = 3;
  const boxW = (USABLE_W - 3 * boxGap) / 4;
  const boxH = 14;
  const boxY = y;
  drawStatBox(doc, LEFT, boxY, boxW, boxH, 'Registros', String(comissoes.length));
  drawStatBox(doc, LEFT + boxW + boxGap, boxY, boxW, boxH, 'Total comissões', formatCurrency(totalValor));
  drawStatBox(doc, LEFT + 2 * (boxW + boxGap), boxY, boxW, boxH, 'Status Paga', formatCurrency(totalPago));
  drawStatBox(doc, LEFT + 3 * (boxW + boxGap), boxY, boxW, boxH, 'Status Calculada', formatCurrency(totalCalc));
  y = boxY + boxH + 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(160, 160, 160);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, LEFT, y);
  doc.setFont('helvetica', 'normal');
  y += 5;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(LEFT, y, RIGHT, y);
  y += 4;

  y = drawTableHeader(y);
  doc.setFontSize(6.5);

  const rowH = 4.8;

  for (let i = 0; i < comissoes.length; i++) {
    const c = comissoes[i];
    if (y + rowH > FOOTER_PAGE_Y - 8) {
      doc.addPage();
      y = M + 2;
      y = drawTableHeader(y);
      doc.setFontSize(6.5);
    }

    const baselineY = y;
    if (i % 2 === 1) {
      doc.setFillColor(ZEBRA.r, ZEBRA.g, ZEBRA.b);
      doc.rect(LEFT, baselineY - 3.9, USABLE_W, rowH, 'F');
    }

    const tipoCom = c.tipo_comissao === 'fixo' ? 'Fixo' : '%';
    const pctFix =
      c.tipo_comissao === 'fixo'
        ? formatCurrency(c.valor_comissao_fixa ?? 0)
        : `${c.percentual_comissao ?? 0}%`;

    let ci = 0;
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    if (!modoDetalhe) {
      doc.text(
        ellipsize(c.tecnico_nome, charsForWidthMm(widths[ci])),
        xs[ci] + 0.5,
        baselineY,
      );
      ci++;
    }
    doc.text(ellipsize(String(c.numero_os || '—'), charsForWidthMm(widths[ci])), xs[ci] + 0.5, baselineY);
    ci++;
    doc.text(ellipsize(c.cliente_nome || '—', charsForWidthMm(widths[ci])), xs[ci] + 0.5, baselineY);
    ci++;
    doc.text(ellipsize(c.servico_nome || '—', charsForWidthMm(widths[ci])), xs[ci] + 0.5, baselineY);
    ci++;
    doc.text(formatDate(c.data_entrega), xs[ci] + 0.5, baselineY);
    ci++;
    doc.text(formatCurrency(c.valor_total), xs[ci] + 0.5, baselineY);
    ci++;
    doc.text(tipoCom, xs[ci] + 0.5, baselineY);
    ci++;
    doc.text(ellipsize(pctFix, charsForWidthMm(widths[ci])), xs[ci] + 0.5, baselineY);
    ci++;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(formatCurrency(c.valor_comissao), xs[ci] + 0.5, baselineY);
    doc.setFont('helvetica', 'normal');
    ci++;
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text(ellipsize(String(c.status || '—'), charsForWidthMm(widths[ci])), xs[ci] + 0.5, baselineY);
    ci++;
    doc.text(ellipsize(String(c.status_os || '—'), charsForWidthMm(widths[ci])), xs[ci] + 0.5, baselineY);

    y += rowH;
  }

  const nomeAssinatura = (detalheTecnicoNome?.trim() || nomeParaAssinatura?.trim() || '');
  if (incluirAssinaturaTecnico && nomeAssinatura) {
    const needSpace = 38;
    if (y + needSpace > FOOTER_PAGE_Y - 6) {
      doc.addPage();
      y = M + 2;
    }
    drawSignatureBlock(doc, y, nomeAssinatura, formatCurrency, totalValor);
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawFooter(doc, p - 1, pageCount);
    if (p === 1) {
      doc.setFontSize(7);
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      doc.text(notaRodape, LEFT, PAGE_H - M - 2);
    }
  }

  const buf = doc.output('arraybuffer');
  return new Blob([buf], { type: 'application/pdf' });
}
