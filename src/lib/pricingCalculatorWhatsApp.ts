import {
  PARCELAS_MAX,
  clampParcelasExibicao,
  formatBRL,
  formatDescontoVistaTexto,
  calcularPrecoVistaExibicao,
  type ModoExibicaoPrecoCliente,
  type OpcaoParcelamento,
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
  opcoesParcelamento: OpcaoParcelamento[];
  exibirMaoDeObraSeparada: boolean;
  exibirParcelamento: boolean;
  modoExibicaoCliente: ModoExibicaoPrecoCliente;
  descontoVistaPercent: number;
  maxParcelas?: number;
  textoPersonalizado?: string;
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

function buildBlocoPrecosWhatsApp(data: OrcamentoWhatsAppData): string[] {
  const {
    precoVenda,
    precoParcelado,
    opcoesParcelamento,
    exibirParcelamento,
    modoExibicaoCliente,
    descontoVistaPercent,
    maxParcelas,
  } = data;
  const parcelasTexto = clampParcelasExibicao(maxParcelas ?? PARCELAS_MAX);

  if (modoExibicaoCliente === 'parcelado_destaque') {
    const precoVistaCliente = calcularPrecoVistaExibicao(
      precoVenda,
      precoParcelado,
      descontoVistaPercent
    );
    const linhas = [
      '',
      `*${formatBRL(precoParcelado)}*`,
      `Parcelado em até ${parcelasTexto}x`,
    ];
    const desconto = formatDescontoVistaTexto(precoVenda, precoParcelado, descontoVistaPercent);
    if (desconto) {
      linhas.push(desconto);
      linhas.push(`À vista: ${formatBRL(precoVistaCliente)}`);
    }
    if (exibirParcelamento && opcoesParcelamento.length > 0) {
      linhas.push('', `*Opções de parcelamento:*`);
      opcoesParcelamento.forEach((opcao) => {
        const destaque = opcao.parcelas === parcelasTexto ? '*' : '';
        linhas.push(`${destaque}${opcao.parcelas}x de ${formatBRL(opcao.valorParcela)}${destaque}`);
      });
    }
    return linhas;
  }

  const linhas = ['', `*À VISTA:* ${formatBRL(precoVenda)}`];
  if (exibirParcelamento && opcoesParcelamento.length > 0) {
    linhas.push('', `*PARCELAMENTO ATÉ ${parcelasTexto}X:*`);
    linhas.push(`Valor parcelado: ${formatBRL(precoParcelado)}`, '');
    opcoesParcelamento.forEach((opcao) => {
      const destaque = opcao.parcelas === parcelasTexto ? '*' : '';
      linhas.push(`${destaque}${opcao.parcelas}x de ${formatBRL(opcao.valorParcela)}${destaque}`);
    });
  }
  return linhas;
}

export function buildOrcamentoWhatsAppMessage(data: OrcamentoWhatsAppData): string {
  const {
    empresa,
    cliente,
    modeloAparelho,
    precoPeca,
    maoDeObra,
    exibirMaoDeObraSeparada,
    textoPersonalizado,
  } = data;

  const linhas: string[] = [
    `*ORÇAMENTO*`,
    `*${empresa.nome}*`,
    '',
    `Olá, ${cliente}! Segue o orçamento para seu aparelho:`,
  ];

  const textoLivre = textoPersonalizado?.trim();
  if (textoLivre) {
    linhas.push('', textoLivre);
  }

  linhas.push('', `*Aparelho:* ${modeloAparelho}`);

  if (exibirMaoDeObraSeparada && maoDeObra > 0) {
    linhas.push('');
    if (precoPeca > 0) linhas.push(`Peça: ${formatBRL(precoPeca)}`);
    linhas.push(`Mão de obra: ${formatBRL(maoDeObra)}`);
  }

  linhas.push(...buildBlocoPrecosWhatsApp(data));

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

export function abrirOrcamentoWhatsApp(
  telefone: string,
  data: OrcamentoWhatsAppData,
  mensagemOverride?: string
): boolean {
  if (!isTelefoneWhatsAppValido(telefone)) return false;

  const numero = normalizeBRPhone(telefone);
  const texto = mensagemOverride?.trim() || buildOrcamentoWhatsAppMessage(data);
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
  return true;
}
