import { labelFormaPagamento } from './forma-pagamento-labels';

export type CupomEmpresaInfo = {
  razao_social?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  vendedor_nome?: string | null;
};

export type CupomVendaDetalhes = {
  venda: {
    numero: number;
    total: number;
    subtotal: number;
    desconto_total: number;
    status: string;
    created_at: string;
    troco: number;
    data_vencimento?: string | null;
    venda_a_prazo?: number;
  };
  itens: {
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    desconto: number;
    total: number;
  }[];
  pagamentos: { forma: string; valor: number }[];
  empresa_nome: string;
  cliente_nome_cupom?: string;
  cliente_documento_cupom?: string | null;
  cupom_empresa?: CupomEmpresaInfo | null;
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMoeda(n: number): string {
  return (Number(n) || 0).toFixed(2).replace('.', ',');
}

function fmtCnpj(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const n = cnpj.replace(/\D/g, '');
  if (n.length !== 14) return cnpj;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

function fmtCpfCnpj(doc: string | null | undefined): string | null {
  if (!doc) return null;
  const n = doc.replace(/\D/g, '');
  if (n.length === 11) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
  if (n.length === 14) return fmtCnpj(n);
  return doc;
}

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function sep(): string {
  return '<div class="cupom-sep"></div>';
}

function row(label: string, value: string, bold = false): string {
  const w = bold ? ' font-weight:700;' : '';
  return `<div class="cupom-row" style="${w}"><span>${label}</span><span>${value}</span></div>`;
}

/** Gera HTML do cupom não fiscal (layout térmico 80mm). */
export function cupomToHtml(d: CupomVendaDetalhes, empresaInfo?: CupomEmpresaInfo | null): string {
  const v = d.venda;
  const info = empresaInfo ?? d.cupom_empresa ?? {};
  const dataHora = fmtDataHora(v.created_at);
  const nomeFantasia = d.empresa_nome.trim() || 'Empresa';
  const razaoSocial = info.razao_social?.trim() || nomeFantasia;
  const endereco = info.endereco?.trim() || null;
  const cnpj = fmtCnpj(info.cnpj);
  const telefone = info.telefone?.trim() || null;
  const vendedor = info.vendedor_nome?.trim() || null;
  const qtdItens = d.itens.reduce((acc, i) => acc + i.quantidade, 0);
  const clienteNome = d.cliente_nome_cupom?.trim() || null;
  const clienteDoc = fmtCpfCnpj(d.cliente_documento_cupom);

  const lines: string[] = [];
  lines.push('<div class="cupom-nao-fiscal">');

  lines.push('<div class="cupom-block cupom-header">');
  lines.push(`<div class="cupom-store">${escapeHtml(nomeFantasia)}</div>`);
  if (razaoSocial !== nomeFantasia) {
    lines.push(`<div class="cupom-meta">${escapeHtml(razaoSocial)}</div>`);
  }
  if (endereco) lines.push(`<div class="cupom-meta">${escapeHtml(endereco)}</div>`);
  if (cnpj) lines.push(`<div class="cupom-meta">CNPJ: ${escapeHtml(cnpj)}</div>`);
  if (telefone) lines.push(`<div class="cupom-meta">Tel: ${escapeHtml(telefone)}</div>`);
  lines.push('</div>');

  lines.push(sep());

  lines.push('<div class="cupom-block cupom-doc-type">');
  lines.push('<div class="cupom-doc-title">COMPROVANTE DE VENDA</div>');
  lines.push('<div class="cupom-doc-sub">CUPOM NÃO FISCAL</div>');
  lines.push('<div class="cupom-doc-note">Documento sem valor fiscal</div>');
  lines.push('</div>');

  lines.push(sep());

  lines.push('<div class="cupom-block cupom-ident">');
  lines.push(row('Cupom nº', String(v.numero).padStart(6, '0')));
  lines.push(row('Data/Hora', escapeHtml(dataHora)));
  if (vendedor) lines.push(row('Operador', escapeHtml(vendedor)));
  if (clienteNome) {
    lines.push(row('Cliente', escapeHtml(clienteNome)));
    if (clienteDoc) lines.push(row('CPF/CNPJ', escapeHtml(clienteDoc)));
  } else {
    lines.push(row('Cliente', 'Consumidor'));
  }
  lines.push('</div>');

  lines.push(sep());

  lines.push('<table class="cupom-itens">');
  lines.push(
    '<thead><tr>' +
      '<th>#</th><th>DESCRIÇÃO</th><th>QTD</th><th>UNIT</th><th>TOTAL</th>' +
      '</tr></thead><tbody>'
  );
  d.itens.forEach((i, idx) => {
    const vlUnit = i.quantidade > 0 ? i.total / i.quantidade : i.preco_unitario;
    lines.push(
      '<tr>' +
        `<td>${String(idx + 1).padStart(2, '0')}</td>` +
        `<td class="cupom-item-desc">${escapeHtml(i.descricao.slice(0, 32))}</td>` +
        `<td>${i.quantidade}</td>` +
        `<td>${fmtMoeda(vlUnit)}</td>` +
        `<td>${fmtMoeda(i.total)}</td>` +
        '</tr>'
    );
    if (i.desconto > 0) {
      lines.push(
        `<tr class="cupom-item-desc-extra"><td colspan="5">desconto item: -R$ ${fmtMoeda(i.desconto)}</td></tr>`
      );
    }
  });
  lines.push('</tbody></table>');

  lines.push(sep());

  lines.push('<div class="cupom-block cupom-totais">');
  lines.push(row('Qtd. total itens', String(qtdItens)));
  lines.push(row('Subtotal R$', fmtMoeda(v.subtotal)));
  if (v.desconto_total > 0) {
    lines.push(row('Descontos R$', `- ${fmtMoeda(v.desconto_total)}`));
  }
  lines.push(`<div class="cupom-total-destaque"><span>TOTAL R$</span><span>${fmtMoeda(v.total)}</span></div>`);
  lines.push('</div>');

  lines.push(sep());

  lines.push('<div class="cupom-block cupom-pagamentos">');
  lines.push('<div class="cupom-section-label">FORMA DE PAGAMENTO</div>');
  for (const p of d.pagamentos) {
    lines.push(row(escapeHtml(labelFormaPagamento(p.forma)), fmtMoeda(p.valor)));
  }
  if (v.troco > 0) {
    lines.push(row('Troco R$', fmtMoeda(v.troco)));
  }
  lines.push('</div>');

  lines.push(sep());

  lines.push('<div class="cupom-block cupom-footer">');
  lines.push('<div class="cupom-thanks">Obrigado pela preferência!</div>');
  lines.push(
    '<div class="cupom-legal">Este comprovante não substitui a Nota Fiscal Eletrônica quando exigida por lei.</div>'
  );
  lines.push('<div class="cupom-brand">Gestão Consert</div>');
  lines.push('</div>');

  lines.push('</div>');
  return lines.join('');
}

export const CUPOM_NAO_FISCAL_STYLES = `
.cupom-nao-fiscal {
  font-family: 'Courier New', Consolas, 'Liberation Mono', monospace;
  font-size: 11px;
  line-height: 1.35;
  color: #111;
  width: 100%;
  max-width: 302px;
  margin: 0 auto;
  padding: 4mm 3mm;
  box-sizing: border-box;
  background: #fff;
}
.cupom-block { margin: 0; }
.cupom-header { text-align: center; }
.cupom-store { font-weight: 700; font-size: 13px; letter-spacing: 0.02em; text-transform: uppercase; }
.cupom-meta { font-size: 10px; margin-top: 3px; line-height: 1.4; word-break: break-word; }
.cupom-sep { border-top: 1px dashed #222; margin: 8px 0; }
.cupom-doc-type { text-align: center; }
.cupom-doc-title { font-weight: 700; font-size: 12px; letter-spacing: 0.04em; }
.cupom-doc-sub { font-weight: 700; font-size: 11px; margin-top: 4px; }
.cupom-doc-note { font-size: 9px; margin-top: 4px; color: #444; }
.cupom-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; margin-top: 3px; }
.cupom-row span:last-child { text-align: right; white-space: nowrap; }
.cupom-section-label { font-weight: 700; font-size: 10px; margin-bottom: 4px; letter-spacing: 0.03em; }
.cupom-itens { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
.cupom-itens th { border-bottom: 1px solid #222; padding: 3px 2px; text-align: left; font-size: 9px; }
.cupom-itens th:nth-child(1) { width: 8%; }
.cupom-itens th:nth-child(2) { width: 40%; }
.cupom-itens th:nth-child(n+3), .cupom-itens td:nth-child(n+3) { text-align: right; }
.cupom-itens td { padding: 4px 2px; vertical-align: top; border-bottom: 1px dotted #bbb; }
.cupom-item-desc { word-break: break-word; overflow-wrap: anywhere; }
.cupom-item-desc-extra td { font-size: 9px; color: #555; border-bottom: none; padding-top: 0; }
.cupom-total-destaque {
  display: flex; justify-content: space-between; font-weight: 700;
  font-size: 13px; margin-top: 8px; padding-top: 6px; border-top: 1px solid #222;
}
.cupom-legal { font-size: 9px; line-height: 1.45; color: #444; margin-top: 8px; text-align: center; }
.cupom-thanks { text-align: center; font-weight: 700; font-size: 11px; }
.cupom-brand { text-align: center; font-size: 9px; color: #666; margin-top: 6px; }
@media print {
  .cupom-nao-fiscal { max-width: none; width: 72mm; padding: 2mm 1mm; }
}
`;

export function cupomNaoFiscalDocumentHtml(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cupom</title><style>${CUPOM_NAO_FISCAL_STYLES}@media print { @page { margin: 2mm; size: 80mm auto; } body { margin: 0; } }</style></head><body>${body}</body></html>`;
}

export function cupomPreviewHtml(body: string): string {
  return `<style>${CUPOM_NAO_FISCAL_STYLES}</style>${body}`;
}
