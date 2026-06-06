import { formatBRL } from '@/lib/pricingCalculator';

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
  exibirMaoDeObraSeparada: boolean;
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
      <div class="value-desc">${escapeHtml(desc)}</div>
      <div class="value-amount">${amount}</div>
    </div>`;
}

function valueTotalRow(desc: string, amount: string): string {
  return `
    <div class="value-total-row">
      <div class="value-desc bold">${escapeHtml(desc)}</div>
      <div class="value-total-amount">${amount}</div>
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
    exibirMaoDeObraSeparada,
  } = data;

  const dataStr = new Date().toLocaleDateString('pt-BR');
  const horaStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const contato = [empresa.telefone || '---', empresa.email].filter(Boolean).join(' | ');

  const linhasValores =
    exibirMaoDeObraSeparada && maoDeObra > 0
      ? `
      ${precoPeca > 0 ? valueRow('Peça', formatBRL(precoPeca)) : ''}
      ${valueRow('Mão de obra', formatBRL(maoDeObra))}
      ${valueTotalRow('TOTAL', formatBRL(precoVenda))}
    `
      : valueTotalRow('VALOR TOTAL', formatBRL(precoVenda));

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orçamento - ${escapeHtml(cliente)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10px;
      margin: 0;
      padding: 10px;
      width: 302px;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }
    .cupom { width: 100%; max-width: 302px; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .secondary { font-size: 9px; color: #000; }
    .logo-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 4px;
    }
    .logo {
      max-width: 160px;
      max-height: 48px;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .line {
      border-bottom: 1.5px solid #000;
      margin: 5px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-weight: bold;
    }
    .section-title {
      font-size: 11px;
      font-weight: bold;
      margin: 0 0 4px;
    }
    .block { margin-bottom: 7px; }
    .value-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5px;
      width: 100%;
    }
    .value-desc {
      flex: 1;
      padding-right: 8px;
      font-weight: bold;
      font-size: 10px;
      word-break: break-word;
    }
    .value-amount {
      font-weight: bold;
      font-size: 10px;
      width: 58px;
      text-align: right;
      flex-shrink: 0;
    }
    .value-total-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 5px;
      padding-top: 5px;
      border-top: 1.5px solid #000;
      width: 100%;
    }
    .value-total-amount {
      font-weight: bold;
      font-size: 12px;
      width: 58px;
      text-align: right;
      flex-shrink: 0;
    }
    .footer-note {
      text-align: center;
      font-size: 9px;
      margin-top: 8px;
    }
    .system-credit {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #000;
      text-align: center;
    }
    .system-credit-name {
      font-size: 8px;
      font-weight: bold;
    }
    .system-credit-link {
      font-size: 8px;
      margin-top: 2px;
    }
    @media print {
      body { margin: 0; padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="cupom">
    <div class="logo-wrap">
      ${logoCupomPreto ? `<img src="${logoCupomPreto}" alt="" class="logo" />` : ''}
    </div>
    <p class="center secondary">CNPJ: ${escapeHtml(formatCnpj(empresa.cnpj))}</p>
    <p class="center bold">${escapeHtml(empresa.endereco || '---')}</p>
    <p class="center secondary">${escapeHtml(contato)}</p>
    ${empresa.website ? `<p class="center secondary">${escapeHtml(empresa.website)}</p>` : ''}
    <div class="line"></div>

    <div class="row">
      <span>ORÇAMENTO</span>
      <span>${dataStr} ${horaStr}</span>
    </div>
    <div class="line"></div>

    <p class="section-title">CLIENTE</p>
    <p class="bold block">${escapeHtml(cliente)}</p>
    <div class="line"></div>

    <p class="section-title">APARELHO</p>
    <p class="bold block">${escapeHtml(modeloAparelho)}</p>
    <div class="line"></div>

    <p class="section-title">VALORES</p>
    ${linhasValores}

    <p class="footer-note">Orçamento válido por 7 dias.</p>

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

  const printWindow = window.open('', '_blank', 'width=360,height=640');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
