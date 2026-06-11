import {
  PARCELAS_MAX,
  calcularValorParcela,
  formatBRL,
} from '@/lib/pricingCalculator';
import { normalizeBRPhone } from '@/lib/sanitize-os-data';
import type { EmpresaCupomData } from '@/lib/pricingCalculatorCupom';

export interface OrcamentoWhatsAppData {
  empresa: EmpresaCupomData;
  cliente: string;
  modeloAparelho: string;
  precoPeca: number;
  maoDeObra: number;
  precoVenda: number;
  precoParcelado: number;
  exibirMaoDeObraSeparada: boolean;
  exibirParcelamento: boolean;
}

export function handlePhoneInputChange(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isTelefoneWhatsAppValido(telefone: string): boolean {
  const digits = telefone.replace(/\D/g, '');
  return digits.length >= 10;
}

export function buildOrcamentoWhatsAppMessage(data: OrcamentoWhatsAppData): string {
  const {
    empresa,
    cliente,
    modeloAparelho,
    precoPeca,
    maoDeObra,
    precoVenda,
    precoParcelado,
    exibirMaoDeObraSeparada,
    exibirParcelamento,
  } = data;

  const valorParcela = calcularValorParcela(precoParcelado, PARCELAS_MAX);
  const linhas: string[] = [
    `*ORÇAMENTO*`,
    `*${empresa.nome}*`,
    '',
    `Olá, ${cliente}! Segue o orçamento para seu aparelho:`,
    '',
    `*Aparelho:* ${modeloAparelho}`,
  ];

  if (exibirMaoDeObraSeparada && maoDeObra > 0) {
    linhas.push('');
    if (precoPeca > 0) linhas.push(`Peça: ${formatBRL(precoPeca)}`);
    linhas.push(`Mão de obra: ${formatBRL(maoDeObra)}`);
  }

  linhas.push(
    '',
    `*À VISTA:* ${formatBRL(precoVenda)}`,
  );

  if (exibirParcelamento) {
    linhas.push(
      '',
      `*PARCELADO EM ATÉ ${PARCELAS_MAX}X:*`,
      `${PARCELAS_MAX}x de ${formatBRL(valorParcela)}`,
      `Total parcelado: ${formatBRL(precoParcelado)}`,
    );
  }

  linhas.push(
    '',
    'Orçamento válido por 7 dias.',
    'Sujeito à disponibilidade de peças.',
  );

  const contato: string[] = [];
  if (empresa.telefone) contato.push(`Tel: ${empresa.telefone}`);
  if (empresa.endereco) contato.push(empresa.endereco);
  if (contato.length > 0) {
    linhas.push('', ...contato);
  }

  return linhas.join('\n');
}

export function abrirOrcamentoWhatsApp(telefone: string, data: OrcamentoWhatsAppData): boolean {
  if (!isTelefoneWhatsAppValido(telefone)) return false;

  const numero = normalizeBRPhone(telefone);
  const texto = buildOrcamentoWhatsAppMessage(data);
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
  return true;
}
