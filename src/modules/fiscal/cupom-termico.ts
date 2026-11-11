/** Utilitários compartilhados para cupom térmico 80mm (NFC-e / NFS-e). */

import fs from 'fs';
import path from 'path';

export const MM = 2.834645669;
/** Largura padrão bobina 80mm */
export const CUPOM_W = 80 * MM;
export const CUPOM_MARGIN = 2.5 * MM;

export function formatChave(chave: string): string {
  return chave.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') ?? chave;
}

export function formatCnpjCpf(value: string): string {
  const d = (value || '').replace(/\D/g, '');
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  return value || '—';
}

export function formatCep(cep: string): string {
  const d = (cep || '').replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}-${d.slice(5)}`;
  return cep || '';
}

export function money(n: number | null | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '0,00';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function moneyBrl(n: number | null | undefined): string {
  return `R$ ${money(n)}`;
}

export function fmtQty(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(n);
}

export function fmtDateTimeBr(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

export function xmlTag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`, 'i'));
  return m?.[1]?.trim() || '';
}

export function xmlCdata(xml: string, name: string): string {
  const cdata = xml.match(new RegExp(`<${name}[^>]*><!\\[CDATA\\[(.*?)\\]\\]></${name}>`, 'is'));
  if (cdata?.[1]) return cdata[1].trim();
  return xmlTag(xml, name);
}

export function xmlBlock(xml: string, name: string): string {
  return xml.match(new RegExp(`<${name}[\\s\\S]*?<\\/${name}>`, 'i'))?.[0] || '';
}

export function xmlBlocks(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}[\\s\\S]*?<\\/${name}>`, 'gi');
  return xml.match(re) || [];
}

export const TPAG_LABEL: Record<string, string> = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartão de Crédito',
  '04': 'Cartão de Débito',
  '05': 'Crédito Loja',
  '10': 'Vale Alimentação',
  '11': 'Vale Refeição',
  '12': 'Vale Presente',
  '13': 'Vale Combustível',
  '15': 'Boleto Bancário',
  '16': 'Depósito Bancário',
  '17': 'PIX',
  '18': 'Transferência bancária',
  '19': 'Programa de fidelidade',
  '90': 'Sem pagamento',
  '99': 'Outros',
};

export function labelTPag(tPag: string, xPag?: string): string {
  if (tPag === '99' && xPag) return xPag;
  return TPAG_LABEL[tPag] || `Forma ${tPag}`;
}

type PdfDoc = PDFKit.PDFDocument;

/** Linha centralizada */
export function center(
  doc: PdfDoc,
  text: string,
  x: number,
  y: number,
  w: number,
  opts?: { bold?: boolean; size?: number; color?: string }
): number {
  const size = opts?.size ?? 7;
  doc
    .font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(size)
    .fillColor(opts?.color || '#000')
    .text(text, x, y, { width: w, align: 'center', lineGap: 1 });
  return doc.y;
}

/** Texto à esquerda com wrapping; retorna y final */
export function left(
  doc: PdfDoc,
  text: string,
  x: number,
  y: number,
  w: number,
  opts?: { bold?: boolean; size?: number; color?: string }
): number {
  const size = opts?.size ?? 7;
  doc
    .font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(size)
    .fillColor(opts?.color || '#000')
    .text(text, x, y, { width: w, align: 'left', lineGap: 1 });
  return doc.y;
}

/** Label à esquerda + valor à direita na mesma linha */
export function rowLR(
  doc: PdfDoc,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  opts?: { bold?: boolean; size?: number }
): number {
  const size = opts?.size ?? 7;
  const font = opts?.bold ? 'Helvetica-Bold' : 'Helvetica';
  doc.font(font).fontSize(size).fillColor('#000');
  const valueW = Math.min(w * 0.42, doc.widthOfString(value) + 2);
  doc.text(label, x, y, { width: w - valueW - 2, align: 'left', lineBreak: false });
  doc.text(value, x + w - valueW, y, { width: valueW, align: 'right', lineBreak: false });
  return y + size + 3;
}

export function sepLine(doc: PdfDoc, x: number, y: number, w: number, dashed = false): number {
  doc.save();
  doc.strokeColor('#000').lineWidth(0.4);
  if (dashed) doc.dash(1.5, { space: 1.5 });
  doc.moveTo(x, y).lineTo(x + w, y).stroke();
  doc.undash();
  doc.restore();
  return y + 4;
}

export function estimateCupomHeight(opts: {
  headerLines: number;
  itemLines: number;
  extraLines: number;
  hasQr: boolean;
}): number {
  const line = 9;
  const base =
    CUPOM_MARGIN * 2 +
    opts.headerLines * line +
    opts.itemLines * (line + 6) +
    opts.extraLines * line +
    40;
  const qr = opts.hasQr ? 110 : 0;
  // + rodapé (saudação + copyright + site)
  return Math.max(280, base + qr + 42);
}

export const CUPOM_SAUDACAO = 'Obrigado pela preferência! Volte sempre.';
export const CUPOM_SISTEMA = 'Gestão Consert';
export const CUPOM_SITE = 'www.gestaoconsert.com.br';

export type CupomLogo = string | Buffer;

function resolveLogoFallbackPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'public/assets/imagens/logopreto.png'),
    path.join(process.cwd(), 'public/fiscal/logo-nfse-horizontal.png'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/** Carrega logo da empresa (URL) ou fallback local do sistema. */
export async function carregarLogoNota(logoUrl?: string | null): Promise<CupomLogo | null> {
  const url = String(logoUrl || '').trim();
  if (url && /^https?:\/\//i.test(url)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 100) return buf;
      }
    } catch {
      /* fallback abaixo */
    }
  }
  return resolveLogoFallbackPath();
}

/**
 * Desenha o logo centralizado no topo.
 * Retorna o Y após a imagem (ou o Y original se falhar).
 */
export function drawLogoTopo(
  doc: PdfDoc,
  logo: CupomLogo | null | undefined,
  x: number,
  y: number,
  w: number,
  opts?: { maxW?: number; maxH?: number }
): number {
  if (!logo) return y;
  const maxW = opts?.maxW ?? Math.min(w * 0.72, 150);
  const maxH = opts?.maxH ?? 34;
  try {
    const xImg = x + (w - maxW) / 2;
    doc.image(logo, xImg, y, { fit: [maxW, maxH], align: 'center', valign: 'center' });
    return y + maxH + 6;
  } catch {
    return y;
  }
}

/** Rodapé padrão: saudação + direitos autorais + site. */
export function rodapeSistema(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  opts?: { sep?: boolean }
): number {
  let yy = y;
  if (opts?.sep !== false) {
    yy = sepLine(doc, x, yy, w);
    yy += 2;
  }
  yy = center(doc, CUPOM_SAUDACAO, x, yy, w, { bold: true, size: 7 });
  yy += 3;
  yy = center(
    doc,
    `© ${new Date().getFullYear()} ${CUPOM_SISTEMA}. Todos os direitos reservados.`,
    x,
    yy,
    w,
    { size: 5.5, color: '#333' }
  );
  yy = center(doc, CUPOM_SITE, x, yy, w, { bold: true, size: 6.5 });
  return yy;
}
