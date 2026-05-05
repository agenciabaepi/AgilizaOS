/**
 * PDF de orçamento comercial (jsPDF, A4 retrato).
 * Layout alinhado ao cabeçalho da OS impressa: logo + dados da empresa + bloco direito (número/datas).
 */
import { jsPDF } from 'jspdf';

const M = 14;
const PAGE_W = 210;
const LW = PAGE_W - 2 * M;
const LINE = 5.2;

function safeStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
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

export interface OrcamentoLinhaPdf {
  descricao: string;
  qtd: number;
  valorUnit: number;
  tipo?: string;
}

export interface OrcamentoPdfInput {
  empresa: {
    nome: string;
    cnpj?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
  };
  numero: string | number;
  dataEmissao: Date;
  validadeDias: number;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  clienteDocumento?: string;
  clienteEndereco?: string;
  linhas: OrcamentoLinhaPdf[];
  valorDesconto: number;
  observacoes: string;
  formaPagamentoLabel: string;
}

function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);
}

function formatDateBR(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

export async function buildOrcamentoPdfBlob(input: OrcamentoPdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = M;

  const subtotal = input.linhas.reduce((acc, l) => acc + l.qtd * l.valorUnit, 0);
  const desconto = Math.max(0, Math.min(subtotal, input.valorDesconto));
  const total = Math.max(0, subtotal - desconto);

  const validadeAte = new Date(input.dataEmissao);
  validadeAte.setDate(validadeAte.getDate() + Math.max(0, input.validadeDias));

  // Logo + empresa + bloco direito
  const logoW = 38;
  const logoH = 22;
  const emp = input.empresa;
  const logoUrl = safeStr(emp.logoUrl);
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    const loaded = await loadLogoAsPngDataUrl(logoUrl);
    if (loaded) {
      const ratio = loaded.w / loaded.h;
      let dw = logoW;
      let dh = logoH;
      if (ratio > dw / dh) {
        dh = dw / ratio;
      } else {
        dw = dh * ratio;
      }
      try {
        doc.addImage(loaded.dataUrl, 'PNG', M, y, dw, dh);
      } catch {
        // ignora logo inválida
      }
    }
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(safeStr(emp.nome) || 'Empresa', M + logoW + 4, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(55, 55, 55);
  let ty = y + 9;
  if (emp.cnpj) {
    doc.text(`CNPJ: ${safeStr(emp.cnpj)}`, M + logoW + 4, ty);
    ty += LINE - 0.5;
  }
  if (emp.endereco) {
    const lines = doc.splitTextToSize(safeStr(emp.endereco), LW - logoW - 52);
    doc.text(lines, M + logoW + 4, ty);
    ty += Math.max(LINE - 0.5, lines.length * 4.2);
  }
  const contato = [emp.telefone, emp.email].filter(Boolean).join(' · ');
  if (contato) {
    doc.text(contato, M + logoW + 4, ty);
  }

  const boxX = PAGE_W - M - 58;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ORÇAMENTO', boxX, y + 3);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Nº ${input.numero}`, boxX, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Emissão: ${formatDateBR(input.dataEmissao)}`, boxX, y + 14.5);
  doc.text(`Validade: ${formatDateBR(validadeAte)} (${input.validadeDias} dias)`, boxX, y + 19.5);

  y = Math.max(y + logoH, y + 22) + 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line(M, y, M + LW, y);
  y += 6;

  // Cliente (mesmo estilo da OS: título em negrito, sem faixa cinza)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Dados do cliente', M, y + 4);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nome: ${safeStr(input.clienteNome) || '—'}`, M, y);
  y += LINE;
  doc.text(`Telefone: ${safeStr(input.clienteTelefone) || '—'}`, M, y);
  y += LINE;
  doc.text(`E-mail: ${safeStr(input.clienteEmail) || '—'}`, M, y);
  y += LINE;
  doc.text(`CPF/CNPJ: ${safeStr(input.clienteDocumento) || '—'}`, M, y);
  y += LINE;
  const endCli = safeStr(input.clienteEndereco);
  if (endCli) {
    const endLines = doc.splitTextToSize(`Endereço: ${endCli}`, LW);
    doc.text(endLines, M, y);
    y += endLines.length * 4;
  } else {
    doc.text('Endereço: —', M, y);
    y += LINE;
  }
  y += 4;

  // Tabela
  doc.setFillColor(238, 238, 238);
  doc.rect(M, y, LW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('#', M + 2, y + 5);
  doc.text('Descrição', M + 10, y + 5);
  doc.text('Tipo', M + LW - 78, y + 5);
  doc.text('Qtd', M + LW - 52, y + 5);
  doc.text('Unit.', M + LW - 38, y + 5);
  doc.text('Total', M + LW - 2, y + 5, { align: 'right' });
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  const rowH = (desc: string) => {
    const lines = doc.splitTextToSize(desc, LW - 88);
    return Math.max(LINE + 2, lines.length * 4 + 3);
  };

  let idx = 1;
  for (const linha of input.linhas) {
    const h = rowH(linha.descricao);
    if (y + h > 280) {
      doc.addPage();
      y = M;
    }
    doc.setDrawColor(200, 200, 200);
    doc.rect(M, y, LW, h, 'S');
    const midY = y + h / 2 + 1.5;
    doc.text(String(idx), M + 2, midY);
    const descLines = doc.splitTextToSize(linha.descricao, LW - 88);
    doc.text(descLines, M + 10, y + 4);
    doc.text(linha.tipo === 'servico' ? 'Serviço' : linha.tipo === 'produto' ? 'Produto' : '—', M + LW - 78, midY);
    doc.text(String(linha.qtd), M + LW - 52, midY);
    doc.text(formatBRL(linha.valorUnit), M + LW - 38, midY);
    doc.text(formatBRL(linha.qtd * linha.valorUnit), M + LW, midY, { align: 'right' });
    y += h;
    idx += 1;
  }

  y += 4;
  if (y > 248) {
    doc.addPage();
    y = M;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Subtotal: ${formatBRL(subtotal)}`, M + LW, y, { align: 'right' });
  y += LINE;
  doc.text(`Desconto: ${formatBRL(desconto)}`, M + LW, y, { align: 'right' });
  y += LINE;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Total: ${formatBRL(total)}`, M + LW, y, { align: 'right' });
  y += LINE + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Forma de pagamento', M, y);
  y += LINE;
  doc.setFont('helvetica', 'normal');
  doc.text(safeStr(input.formaPagamentoLabel) || '—', M, y);
  y += LINE + 3;

  if (safeStr(input.observacoes)) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observações', M, y);
    y += LINE;
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(input.observacoes, LW);
    doc.text(obsLines, M, y);
    y += obsLines.length * 4 + 2;
  }

  y = Math.max(y, 275);
  doc.setDrawColor(220, 220, 220);
  doc.line(M, y, M + LW, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento sem valor fiscal. Valores e prazo sujeitos à confirmação.', M + LW / 2, y, { align: 'center' });
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, M + LW / 2, y + 4, { align: 'center' });

  const buf = doc.output('arraybuffer');
  return new Blob([buf], { type: 'application/pdf' });
}
