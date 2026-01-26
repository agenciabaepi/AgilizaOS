/**
 * Geração de PDF da OS usando jspdf (evita bug dictionary.data.S do @react-pdf/pdfkit).
 * Usado por: /api/pdf/gerar-os
 */
import { jsPDF } from 'jspdf';
import { stripHTML } from './utils';

const M = 20; // margem mm
const LW = 175; // largura útil (A4 210 - 2*M)
const LINE = 6;

function safeStr(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export async function generateOSPDF(osData: any): Promise<Buffer> {
  const os = osData && typeof osData === 'object' ? osData : {};
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = M;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(0, 123, 255);
  doc.text(`ORDEM DE SERVIÇO #${safeStr(os?.numero_os) || '-'}`, 105, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Data: ${os?.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '-'}`, 105, y, { align: 'center' });
  y += 12;

  const sec = (title: string, rows: [string, string][], long?: { label: string; value: string }) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(M, y, LW, 8, 'F');
    doc.setFillColor(0, 123, 255);
    doc.rect(M, y, 4, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, M + 6, y + 5.5);
    doc.setFont('helvetica', 'normal');
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    for (const [l, v] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.text(l, M, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(safeStr(v) || 'Não informado', M + 2, y, { maxWidth: LW - 2 });
      y += LINE;
      doc.setTextColor(102, 102, 102);
    }
    if (long) {
      if (long.label) {
        doc.setFont('helvetica', 'bold');
        doc.text(long.label, M, y);
        doc.setFont('helvetica', 'normal');
        y += LINE;
      }
      doc.setTextColor(0, 0, 0);
      const txt = (safeStr(long.value) || 'Não informado').slice(0, 1500);
      const lines = doc.splitTextToSize(txt, LW - 2);
      doc.text(lines, M + (long.label ? 2 : 0), y + (long.label ? 0 : 2));
      y += 4 + lines.length * 5;
    }
    y += 4;
  };

  const cli = os?.clientes ?? os?.cliente ?? null;
  sec('Dados do Cliente', [
    ['Nome:', cli?.nome],
    ['Telefone:', cli?.telefone],
    ['Email:', cli?.email],
  ]);

  sec('Dados do Equipamento', [
    ['Marca:', os?.marca],
    ['Modelo:', os?.modelo],
  ], { label: 'Problema Relatado:', value: safeStr(os?.problema_relatado) });

  sec('Informações do Serviço', [
    ['Status:', os?.status],
    ['Serviço:', os?.servico],
  ], { label: 'Observações:', value: safeStr(os?.observacoes) });

  if (os?.orcamento) {
    sec('Orçamento', [], { label: '', value: String(os.orcamento) });
  }

  if (os?.laudo) {
    const laudo = stripHTML(String(os.laudo)).slice(0, 1500);
    sec('Laudo Técnico', [], { label: '', value: laudo });
  }

  // Footer
  y = Math.max(y, 270);
  doc.setDrawColor(220, 220, 220);
  doc.line(M, y, M + LW, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.text('Este documento foi gerado automaticamente pelo sistema.', 105, y, { align: 'center' });
  doc.text(`Data de geração: ${new Date().toLocaleString('pt-BR')}`, 105, y + 5, { align: 'center' });

  const buf = doc.output('arraybuffer');
  return Buffer.from(buf);
}
