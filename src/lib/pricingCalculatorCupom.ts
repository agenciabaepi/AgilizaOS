import { formatBRL } from '@/lib/pricingCalculator';

export interface EmpresaCupomData {
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}

export interface OrcamentoCupomData {
  empresa: EmpresaCupomData;
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

export function imprimirCupomOrcamento(data: OrcamentoCupomData): void {
  const { empresa, cliente, modeloAparelho, precoPeca, maoDeObra, precoVenda, exibirMaoDeObraSeparada } = data;
  const dataStr = new Date().toLocaleDateString('pt-BR');
  const horaStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const linhasValores = exibirMaoDeObraSeparada && maoDeObra > 0
    ? `
      ${precoPeca > 0 ? `
        <div class="total-row">
          <span>Peça</span>
          <span>${formatBRL(precoPeca)}</span>
        </div>` : ''}
      <div class="total-row">
        <span>Mão de obra</span>
        <span>${formatBRL(maoDeObra)}</span>
      </div>
      <div class="total-final">
        <span>TOTAL</span>
        <span>${formatBRL(precoVenda)}</span>
      </div>
    `
    : `
      <div class="total-final">
        <span>VALOR TOTAL</span>
        <span>${formatBRL(precoVenda)}</span>
      </div>
    `;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orçamento - ${escapeHtml(cliente)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      margin: 0;
      padding: 10px;
      width: 300px;
      line-height: 1.3;
      color: #000;
      background: #fff;
    }
    .cupom { width: 100%; max-width: 300px; margin: 0 auto; }
    .header {
      text-align: center;
      border-bottom: 1px dashed #666;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .company-name { font-weight: bold; font-size: 15px; margin: 0 0 4px; }
    .cupom-title { font-size: 10px; margin: 0 0 2px; }
    .section { margin-bottom: 8px; font-size: 10px; }
    .section p { margin: 0 0 2px; }
    .separator { border-bottom: 1px dashed #666; margin: 8px 0; }
    .label { font-weight: bold; }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 11px;
    }
    .total-final {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 14px;
      border-top: 1px solid #666;
      padding-top: 6px;
      margin-top: 6px;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      margin-top: 12px;
    }
    @media print {
      body { margin: 0; padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="cupom">
    <div class="header">
      <h1 class="company-name">${escapeHtml(empresa.nome)}</h1>
      <p class="cupom-title">ORÇAMENTO</p>
      <p class="cupom-title">${dataStr} ${horaStr}</p>
    </div>

    <div class="section">
      ${empresa.endereco ? `<p>${escapeHtml(empresa.endereco)}</p>` : ''}
      ${empresa.cnpj ? `<p>CNPJ: ${escapeHtml(empresa.cnpj)}</p>` : ''}
      ${empresa.telefone ? `<p>Tel: ${escapeHtml(empresa.telefone)}</p>` : ''}
      ${empresa.email ? `<p>${escapeHtml(empresa.email)}</p>` : ''}
    </div>

    <div class="separator"></div>

    <div class="section">
      <p><span class="label">Cliente:</span> ${escapeHtml(cliente)}</p>
      <p><span class="label">Aparelho:</span> ${escapeHtml(modeloAparelho)}</p>
    </div>

    <div class="separator"></div>

    <div class="section">
      ${linhasValores}
    </div>

    <div class="footer">
      <p>Orçamento válido por 7 dias.</p>
      <p>Obrigado pela preferência!</p>
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
