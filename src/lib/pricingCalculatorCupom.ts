import {
  PARCELAS_MAX,
  formatBRL,
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

function padEnd(text: string, len: number): string {
  const s = text.slice(0, len);
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function padStart(text: string, len: number): string {
  const s = text.slice(0, len);
  return ' '.repeat(Math.max(0, len - s.length)) + s;
}

function linhaTabela(
  cod: string,
  descricao: string,
  qtd: string,
  vlrUnit: string,
  vlrTotal: string
): string {
  return `|${padEnd(cod, 4)}|${padEnd(descricao, 18)}|${padStart(qtd, 3)}| X |${padStart(vlrUnit, 8)}|${padStart(vlrTotal, 9)}|`;
}

function cabecalhoTabela(): string {
  return [
    linhaTabela('COD', 'Descricao', 'Qtd', 'Vlr Unit', 'Vlr Total'),
    '='.repeat(56),
  ].join('\n');
}

function linhaResumo(label: string, valor: string, largura = 28): string {
  return `${padEnd(label, largura)}${padStart(valor, 12)}`;
}

function buildLinhasItens(
  modeloAparelho: string,
  valorPrincipal: number,
  precoPeca: number,
  maoDeObra: number,
  exibirMaoDeObraSeparada: boolean
): string[] {
  const linhas: string[] = [];

  if (exibirMaoDeObraSeparada && maoDeObra > 0) {
    if (precoPeca > 0) {
      const v = formatCupomValor(precoPeca);
      linhas.push(linhaTabela('001', 'Peça', '1', v, v));
    }
    const mo = formatCupomValor(maoDeObra);
    linhas.push(linhaTabela('002', 'Mão de obra', '1', mo, mo));
  } else {
    const desc = modeloAparelho.length > 18 ? `${modeloAparelho.slice(0, 15)}...` : modeloAparelho;
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
    linhas.push(`Parcelado em até ${PARCELAS_MAX}x`);
    const desconto = formatDescontoVistaTexto(precoVenda, precoParcelado, descontoVistaPercent);
    if (desconto) {
      linhas.push(desconto);
      linhas.push(linhaResumo('À vista:', formatCupomValor(precoVistaCliente)));
    }
    return linhas.join('\n');
  }

  const linhas = [linhaResumo('Valor à vista:', formatCupomValor(precoVenda))];
  if (exibirParcelamento && precoParcelado > precoVenda) {
    linhas.push(linhaResumo('Valor parcelado:', formatCupomValor(precoParcelado)));
  }
  return linhas.join('\n');
}

function buildLinhasParcelas(opcoesParcelamento: OpcaoParcelamento[]): string[] {
  return opcoesParcelamento.map((opcao) => {
    const v = formatCupomValor(opcao.valorParcela);
    const desc = `Parcelado ${opcao.parcelas}x`;
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

  const tabelaItens = [cabecalhoTabela(), ...linhasItens, '='.repeat(56)].join('\n');

  let blocoParcelamento = '';
  if (exibirParcelamento && opcoesParcelamento.length > 0) {
    const linhasOpcoes = buildLinhasParcelas(opcoesParcelamento);

    blocoParcelamento = `
      <p class="section-title">PARCELAMENTO</p>
      <pre class="receipt-table">${cabecalhoTabela()}
${linhasOpcoes.join('\n')}
${'='.repeat(56)}</pre>
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
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      width: 302px;
      margin: 0 auto;
      padding: 10px 8px 14px;
    }
    .cupom { width: 100%; }
    .center { text-align: center; }
    .logo-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 6px;
    }
    .logo { max-width: 140px; max-height: 44px; object-fit: contain; }
    .empresa-nome {
      font-weight: 700;
      font-size: 11px;
      text-align: center;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .empresa-info {
      text-align: center;
      font-size: 9px;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .rule {
      border: none;
      border-top: 1px solid #000;
      margin: 8px 0;
    }
    .rule-double {
      border: none;
      border-top: 2px solid #000;
      margin: 8px 0;
    }
    .doc-title {
      text-align: center;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.1em;
      margin-bottom: 2px;
    }
    .doc-meta {
      text-align: center;
      font-size: 9px;
      margin-bottom: 8px;
    }
    .meta-line {
      font-size: 9px;
      margin-bottom: 3px;
      word-break: break-word;
    }
    .meta-line strong { font-weight: 700; }
    .section-title {
      font-weight: 700;
      font-size: 9px;
      text-align: center;
      margin: 10px 0 6px;
      letter-spacing: 0.06em;
    }
    .receipt-table {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px;
      line-height: 1.3;
      white-space: pre;
      overflow-x: hidden;
      width: 100%;
      margin: 0 0 4px;
    }
    .resumo {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px;
      line-height: 1.5;
      white-space: pre;
      margin: 8px 0;
    }
    .resumo strong { font-weight: 700; }
    .footer-note {
      text-align: center;
      font-size: 8px;
      line-height: 1.45;
      margin: 10px 0 8px;
    }
    .system-credit {
      text-align: center;
      font-size: 8px;
      padding-top: 8px;
      border-top: 1px solid #000;
    }
    @media print {
      body { padding: 8px 6px 12px; }
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
    <pre class="receipt-table">${tabelaItens}</pre>

    ${blocoParcelamento}

    <pre class="resumo"><strong>${resumoLinhas}</strong></pre>

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
