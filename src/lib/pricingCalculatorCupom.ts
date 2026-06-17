import {
  PARCELAS_MAX,
  calcularPrecoVistaExibicao,
  formatDescontoVistaTexto,
  type ModoExibicaoPrecoCliente,
  type OpcaoParcelamento,
} from '@/lib/pricingCalculator';

export interface EmpresaCupomData {
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  website?: string;
}

export interface OrcamentoCupomData {
  empresa: EmpresaCupomData;
  logoCupomPreto?: string | null;
  cliente: string;
  modeloAparelho: string;
  precoPeca: number;
  maoDeObra: number;
  precoVenda: number;
  precoParcelado: number;
  opcoesParcelamento: OpcaoParcelamento[];
  exibirMaoDeObraSeparada: boolean;
  exibirParcelamento: boolean;
  modoExibicaoCliente: ModoExibicaoPrecoCliente;
  descontoVistaPercent: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCnpj(raw: string | null | undefined): string {
  if (!raw) return '---';
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return String(raw);
}

/** Valor numérico no padrão cupom fiscal: 1.050,00 */
function formatCupomValor(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

interface LinhaTabelaCupom {
  cod: string;
  descricao: string;
  qtd: string;
  vlrUnit: string;
  vlrTotal: string;
}

function linhaTabela(
  cod: string,
  descricao: string,
  qtd: string,
  vlrUnit: string,
  vlrTotal: string
): LinhaTabelaCupom {
  return { cod, descricao, qtd, vlrUnit, vlrTotal };
}

function renderTabelaCupom(linhas: LinhaTabelaCupom[]): string {
  const rows = linhas
    .map(
      (l) => `
      <tr>
        <td class="col-cod">${escapeHtml(l.cod)}</td>
        <td class="col-desc">${escapeHtml(l.descricao)}</td>
        <td class="col-qtd">${escapeHtml(l.qtd)}</td>
        <td class="col-unit">${escapeHtml(l.vlrUnit)}</td>
        <td class="col-total">${escapeHtml(l.vlrTotal)}</td>
      </tr>`
    )
    .join('');

  return `
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-cod">COD</th>
          <th class="col-desc">Descrição</th>
          <th class="col-qtd">Qtd</th>
          <th class="col-unit">Vlr Unit</th>
          <th class="col-total">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function linhaResumo(label: string, valor: string): string {
  return `<div class="resumo-row"><span class="resumo-label">${escapeHtml(label)}</span><span class="resumo-valor">${escapeHtml(valor)}</span></div>`;
}

function buildLinhasItens(
  modeloAparelho: string,
  valorPrincipal: number,
  precoPeca: number,
  maoDeObra: number,
  exibirMaoDeObraSeparada: boolean
): LinhaTabelaCupom[] {
  const linhas: LinhaTabelaCupom[] = [];

  if (exibirMaoDeObraSeparada && maoDeObra > 0) {
    if (precoPeca > 0) {
      const v = formatCupomValor(precoPeca);
      linhas.push(linhaTabela('001', 'Peça', '1', v, v));
    }
    const mo = formatCupomValor(maoDeObra);
    linhas.push(linhaTabela('002', 'Mão de obra', '1', mo, mo));
  } else {
    const desc = modeloAparelho.length > 24 ? `${modeloAparelho.slice(0, 21)}...` : modeloAparelho;
    const v = formatCupomValor(valorPrincipal);
    linhas.push(linhaTabela('001', desc, '1', v, v));
  }

  return linhas;
}

function buildResumoCupom(
  modo: ModoExibicaoPrecoCliente,
  precoVenda: number,
  precoParcelado: number,
  exibirParcelamento: boolean,
  descontoVistaPercent: number
): string {
  if (modo === 'parcelado_destaque') {
    const precoVistaCliente = calcularPrecoVistaExibicao(
      precoVenda,
      precoParcelado,
      descontoVistaPercent
    );
    const linhas = [linhaResumo('Valor parcelado:', formatCupomValor(precoParcelado))];
    linhas.push(`<p class="resumo-note">Parcelado em até ${PARCELAS_MAX}x</p>`);
    const desconto = formatDescontoVistaTexto(precoVenda, precoParcelado, descontoVistaPercent);
    if (desconto) {
      linhas.push(`<p class="resumo-note">${escapeHtml(desconto)}</p>`);
      linhas.push(linhaResumo('À vista:', formatCupomValor(precoVistaCliente)));
    }
    return linhas.join('');
  }

  const linhas = [linhaResumo('Valor à vista:', formatCupomValor(precoVenda))];
  if (exibirParcelamento && precoParcelado > precoVenda) {
    linhas.push(linhaResumo('Valor parcelado:', formatCupomValor(precoParcelado)));
  }
  return linhas.join('');
}

function buildLinhasParcelas(opcoesParcelamento: OpcaoParcelamento[]): LinhaTabelaCupom[] {
  return opcoesParcelamento.map((opcao) => {
    const v = formatCupomValor(opcao.valorParcela);
    const desc = `${opcao.parcelas}x`;
    const cod = String(opcao.parcelas).padStart(3, '0');
    return linhaTabela(cod, desc, '1', v, v);
  });
}

export function imprimirCupomOrcamento(data: OrcamentoCupomData): void {
  const {
    empresa,
    logoCupomPreto,
    cliente,
    modeloAparelho,
    precoPeca,
    maoDeObra,
    precoVenda,
    precoParcelado,
    opcoesParcelamento,
    exibirMaoDeObraSeparada,
    exibirParcelamento,
    modoExibicaoCliente,
    descontoVistaPercent,
  } = data;

  const dataStr = new Date().toLocaleDateString('pt-BR');
  const horaStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const valorPrincipal =
    modoExibicaoCliente === 'parcelado_destaque' ? precoParcelado : precoVenda;

  const linhasItens = buildLinhasItens(
    modeloAparelho,
    valorPrincipal,
    precoPeca,
    maoDeObra,
    exibirMaoDeObraSeparada
  );

  const tabelaItens = renderTabelaCupom(linhasItens);

  let blocoParcelamento = '';
  if (exibirParcelamento && opcoesParcelamento.length > 0) {
    const linhasOpcoes = buildLinhasParcelas(opcoesParcelamento);
    blocoParcelamento = `
      <p class="section-title">PARCELAMENTO</p>
      ${renderTabelaCupom(linhasOpcoes)}
    `;
  }

  const resumoLinhas = buildResumoCupom(
    modoExibicaoCliente,
    precoVenda,
    precoParcelado,
    exibirParcelamento,
    descontoVistaPercent
  );

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orçamento - ${escapeHtml(cliente)}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, 'Liberation Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
      padding: 4mm 3mm 5mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cupom { width: 100%; }
    .logo-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 4px;
    }
    .logo { max-width: 50mm; max-height: 14mm; object-fit: contain; }
    .empresa-nome {
      font-weight: 800;
      font-size: 14px;
      text-align: center;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    .empresa-info {
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.45;
      margin-bottom: 6px;
    }
    .rule {
      border: none;
      border-top: 1px solid #000;
      margin: 6px 0;
    }
    .rule-double {
      border: none;
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .doc-title {
      text-align: center;
      font-weight: 800;
      font-size: 14px;
      margin-bottom: 2px;
    }
    .doc-meta {
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .meta-line {
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 3px;
      word-break: break-word;
    }
    .meta-line strong { font-weight: 800; }
    .section-title {
      font-weight: 800;
      font-size: 12px;
      text-align: center;
      margin: 8px 0 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 4px;
      table-layout: fixed;
    }
    .items-table th,
    .items-table td {
      border-bottom: 1px solid #000;
      padding: 2px 1px;
      vertical-align: top;
      word-wrap: break-word;
    }
    .items-table thead th {
      font-weight: 800;
      font-size: 9px;
      border-bottom: 2px solid #000;
      padding-bottom: 3px;
    }
    .items-table tbody tr:last-child td {
      border-bottom: 2px solid #000;
    }
    .col-cod { width: 11%; text-align: center; }
    .col-desc { width: 34%; text-align: left; }
    .col-qtd { width: 10%; text-align: center; }
    .col-unit { width: 22%; text-align: right; font-variant-numeric: tabular-nums; }
    .col-total { width: 23%; text-align: right; font-variant-numeric: tabular-nums; }
    .resumo {
      margin: 8px 0;
      font-size: 12px;
      font-weight: 700;
    }
    .resumo-row {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      margin-bottom: 3px;
    }
    .resumo-label { font-weight: 700; }
    .resumo-valor {
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .resumo-note {
      font-size: 11px;
      font-weight: 700;
      text-align: center;
      margin: 4px 0;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.45;
      margin: 8px 0 6px;
    }
    .system-credit {
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      padding-top: 6px;
      border-top: 1px solid #000;
    }
    @media print {
      body {
        width: 72mm;
        padding: 2mm 2mm 4mm;
        font-weight: 700;
      }
      .items-table { font-size: 10px; }
      .items-table th,
      .items-table td {
        border-color: #000 !important;
      }
    }
  </style>
</head>
<body>
  <div class="cupom">
    <div class="logo-wrap">
      ${
        logoCupomPreto
          ? `<img src="${logoCupomPreto}" alt="" class="logo" />`
          : `<p class="empresa-nome">${escapeHtml(empresa.nome)}</p>`
      }
    </div>

    <div class="empresa-info">
      ${logoCupomPreto ? `<p class="empresa-nome">${escapeHtml(empresa.nome)}</p>` : ''}
      <p>CNPJ: ${escapeHtml(formatCnpj(empresa.cnpj))}</p>
      <p>${escapeHtml(empresa.endereco || '---')}</p>
      ${empresa.telefone ? `<p>Tel: ${escapeHtml(empresa.telefone)}</p>` : ''}
      ${empresa.email ? `<p>${escapeHtml(empresa.email)}</p>` : ''}
    </div>

    <hr class="rule-double" />

    <p class="doc-title">ORÇAMENTO</p>
    <p class="doc-meta">${dataStr} · ${horaStr}</p>

    <p class="meta-line"><strong>Cliente:</strong> ${escapeHtml(cliente)}</p>
    <p class="meta-line"><strong>Aparelho:</strong> ${escapeHtml(modeloAparelho)}</p>

    <hr class="rule" />

    <p class="section-title">VALORES</p>
    ${tabelaItens}

    ${blocoParcelamento}

    <div class="resumo">${resumoLinhas}</div>

    <p class="footer-note">
      Orçamento válido por 7 dias.<br />
      Sujeito à disponibilidade de peças.
    </p>

    <div class="system-credit">
      <p>Gestão Consert</p>
      <p>www.gestaoconsert.com.br</p>
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=360,height=800');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
