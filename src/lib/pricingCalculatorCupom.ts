import {
  PARCELAS_MAX,
  calcularValorParcela,
  formatBRL,
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
  exibirMaoDeObraSeparada: boolean;
  exibirParcelamento: boolean;
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

function valueRow(desc: string, amount: string): string {
  return `
    <div class="value-row">
      <span class="value-desc">${escapeHtml(desc)}</span>
      <span class="value-amount">${amount}</span>
    </div>`;
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
    exibirMaoDeObraSeparada,
    exibirParcelamento,
  } = data;

  const dataStr = new Date().toLocaleDateString('pt-BR');
  const horaStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const contato = [empresa.telefone || '---', empresa.email].filter(Boolean).join(' · ');
  const valorParcela = calcularValorParcela(precoParcelado, PARCELAS_MAX);

  const detalheValores =
    exibirMaoDeObraSeparada && maoDeObra > 0
      ? `
        ${precoPeca > 0 ? valueRow('Peça', formatBRL(precoPeca)) : ''}
        ${valueRow('Mão de obra', formatBRL(maoDeObra))}
      `
      : '';

  const blocoParcelamento = exibirParcelamento
    ? `
      <div class="pay-box pay-installment">
        <p class="pay-label">PARCELADO EM ATÉ ${PARCELAS_MAX}X</p>
        <p class="pay-highlight">${PARCELAS_MAX}x de ${formatBRL(valorParcela)}</p>
        <p class="pay-sub">Total parcelado: ${formatBRL(precoParcelado)}</p>
      </div>
    `
    : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orçamento - ${escapeHtml(cliente)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: 302px;
      margin: 0 auto;
      padding: 12px 10px 16px;
    }
    .cupom { width: 100%; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .muted { font-size: 9px; line-height: 1.35; }
    .logo-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 52px;
      margin-bottom: 6px;
    }
    .logo {
      max-width: 168px;
      max-height: 52px;
      object-fit: contain;
    }
    .empresa-info { text-align: center; margin-bottom: 2px; }
    .empresa-info p { margin-bottom: 2px; }
    .empresa-endereco { font-weight: 700; font-size: 10px; margin: 3px 0; }
    .line-solid {
      border: none;
      border-top: 1.5px solid #000;
      margin: 7px 0;
    }
    .line-dashed {
      border: none;
      border-top: 1px dashed #555;
      margin: 6px 0;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.04em;
      margin: 2px 0;
    }
    .doc-date { font-size: 9px; font-weight: 700; letter-spacing: 0; }
    .section { margin: 8px 0 4px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
    .section-body {
      font-size: 11px;
      font-weight: 700;
      line-height: 1.35;
      word-break: break-word;
    }
    .value-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 4px;
      font-size: 10px;
    }
    .value-desc { flex: 1; font-weight: 600; }
    .value-amount { font-weight: 700; white-space: nowrap; }
    .pay-section { margin-top: 8px; }
    .pay-box {
      border: 1.5px solid #000;
      padding: 8px 10px;
      margin-bottom: 6px;
      text-align: center;
    }
    .pay-cash {
      background: #fff;
    }
    .pay-installment {
      background: #f7f7f7;
    }
    .pay-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }
    .pay-highlight {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
    }
    .pay-sub {
      font-size: 9px;
      margin-top: 3px;
    }
    .footer-note {
      text-align: center;
      font-size: 9px;
      margin: 10px 0 6px;
      line-height: 1.4;
    }
    .system-credit {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #000;
      text-align: center;
    }
    .system-credit-name {
      font-size: 8px;
      font-weight: 700;
    }
    .system-credit-link {
      font-size: 8px;
      margin-top: 2px;
    }
    @media print {
      body { padding: 8px; }
      .pay-installment { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="cupom">
    <div class="logo-wrap">
      ${logoCupomPreto ? `<img src="${logoCupomPreto}" alt="" class="logo" />` : `<p class="bold center" style="font-size:13px">${escapeHtml(empresa.nome)}</p>`}
    </div>

    <div class="empresa-info muted">
      <p>CNPJ: ${escapeHtml(formatCnpj(empresa.cnpj))}</p>
      <p class="empresa-endereco">${escapeHtml(empresa.endereco || '---')}</p>
      <p>${escapeHtml(contato)}</p>
      ${empresa.website ? `<p>${escapeHtml(empresa.website)}</p>` : ''}
    </div>

    <hr class="line-solid" />

    <div class="doc-header">
      <span>ORÇAMENTO</span>
      <span class="doc-date">${dataStr} · ${horaStr}</span>
    </div>

    <hr class="line-solid" />

    <div class="section">
      <p class="section-title">CLIENTE</p>
      <p class="section-body">${escapeHtml(cliente)}</p>
    </div>

    <hr class="line-dashed" />

    <div class="section">
      <p class="section-title">APARELHO</p>
      <p class="section-body">${escapeHtml(modeloAparelho)}</p>
    </div>

    <hr class="line-solid" />

    <div class="section">
      <p class="section-title">VALORES</p>
      ${detalheValores}
    </div>

    <div class="pay-section">
      <div class="pay-box pay-cash">
        <p class="pay-label">À VISTA</p>
        <p class="pay-highlight">${formatBRL(precoVenda)}</p>
      </div>
      ${blocoParcelamento}
    </div>

    <p class="footer-note">Orçamento válido por 7 dias.<br/>Sujeito à disponibilidade de peças.</p>

    <div class="system-credit">
      <p class="system-credit-name">Gestão Consert</p>
      <p class="system-credit-link">www.gestaoconsert.com.br</p>
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

  const printWindow = window.open('', '_blank', 'width=360,height=720');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
