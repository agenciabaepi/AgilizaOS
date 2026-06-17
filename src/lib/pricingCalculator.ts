export type ModoExibicaoPrecoCliente = 'separado' | 'parcelado_destaque';

export interface ConfiguracaoPrecificacao {
  markup_percent: number;
  imposto_percent: number;
  juros_parcelamento_percent: number;
  frete_valor: number;
  modo_exibicao_cliente: ModoExibicaoPrecoCliente;
  desconto_vista_percent: number;
  configurado: boolean;
}

export const MODO_EXIBICAO_CLIENTE_OPTIONS: {
  value: ModoExibicaoPrecoCliente;
  label: string;
  description: string;
}[] = [
  {
    value: 'separado',
    label: 'À vista e parcelado separados',
    description: 'Ex: R$ 100,00 à vista e R$ 120,00 parcelado.',
  },
  {
    value: 'parcelado_destaque',
    label: 'Parcelado em destaque com desconto à vista',
    description: 'Ex: R$ 120,00 parcelado em até 12x — 17% de desconto à vista.',
  },
];

export type SaudePreco = 'saudavel' | 'apertado' | 'insuficiente';

export interface ResultadoPrecificacao {
  precoPeca: number;
  precoVenda: number;
  precoParcelado: number;
  jurosPercent: number;
  opcoesParcelamento: OpcaoParcelamento[];
  lucroBruto: number;
  margemBrutaPercent: number;
  saude: SaudePreco;
}

export interface OpcaoParcelamento {
  parcelas: number;
  valorParcela: number;
  totalParcelado: number;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function parsePercentInput(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export function parseMoneyInput(input: string): number {
  const digits = input.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function formatMoneyInput(value: number): string {
  return formatBRL(value);
}

export function handleMoneyInputChange(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return formatMoneyInput(parseInt(digits, 10) / 100);
}

export function isConfiguracaoValida(config: ConfiguracaoPrecificacao | null): boolean {
  return Boolean(config?.configurado);
}

export function calcularPrecificacao(
  custoPeca: number,
  config: ConfiguracaoPrecificacao,
  maoDeObra = 0
): ResultadoPrecificacao {
  const custoSeguro = Math.max(0, custoPeca);
  const maoDeObraSegura = Math.max(0, maoDeObra);
  const frete = Math.max(0, config.frete_valor);
  const markup = config.markup_percent / 100;
  const imposto = config.imposto_percent / 100;

  const baseComFrete = custoSeguro + frete;
  const precoPeca = baseComFrete * (1 + markup) * (1 + imposto);
  const precoVenda = precoPeca + maoDeObraSegura;
  const jurosPercent = config.juros_parcelamento_percent;
  const precoParcelado = calcularPrecoParcelado(precoVenda, jurosPercent);
  const opcoesParcelamento = calcularOpcoesParcelamento(precoVenda, jurosPercent);
  const lucroBruto = precoVenda - custoSeguro - frete;
  const margemBrutaPercent = precoVenda > 0 ? (lucroBruto / precoVenda) * 100 : 0;

  let saude: SaudePreco = 'insuficiente';
  if (margemBrutaPercent >= 20 && lucroBruto > 0) {
    saude = 'saudavel';
  } else if (margemBrutaPercent >= 10 && lucroBruto > 0) {
    saude = 'apertado';
  }

  return {
    precoPeca,
    precoVenda,
    precoParcelado,
    jurosPercent,
    opcoesParcelamento,
    lucroBruto,
    margemBrutaPercent,
    saude,
  };
}

export const PARCELAS_MIN = 2;
export const PARCELAS_MAX = 12;

export function calcularPrecoParcelado(precoVenda: number, jurosPercent: number): number {
  const juros = Math.max(0, jurosPercent) / 100;
  return precoVenda * (1 + juros);
}

export function calcularOpcoesParcelamento(
  precoVenda: number,
  jurosPercent: number,
  maxParcelas = PARCELAS_MAX,
  minParcelas = PARCELAS_MIN
): OpcaoParcelamento[] {
  const totalParcelado = calcularPrecoParcelado(precoVenda, jurosPercent);
  if (totalParcelado <= 0) return [];

  const opcoes: OpcaoParcelamento[] = [];
  for (let parcelas = minParcelas; parcelas <= maxParcelas; parcelas++) {
    opcoes.push({
      parcelas,
      valorParcela: totalParcelado / parcelas,
      totalParcelado,
    });
  }
  return opcoes;
}

export function calcularValorParcela(precoParcelado: number, parcelas = PARCELAS_MAX): number {
  if (parcelas <= 0 || precoParcelado <= 0) return 0;
  return precoParcelado / parcelas;
}

/** Desconto à vista em relação ao valor parcelado (ex: 120 parcelado, 100 à vista → 16,7%) */
export function calcularDescontoVistaPercent(precoVenda: number, precoParcelado: number): number {
  if (precoParcelado <= 0 || precoVenda >= precoParcelado) return 0;
  return Math.round(((precoParcelado - precoVenda) / precoParcelado) * 1000) / 10;
}

export function obterDescontoVistaPercent(
  precoVenda: number,
  precoParcelado: number,
  descontoVistaConfigurado = 0
): number {
  if (descontoVistaConfigurado > 0) return descontoVistaConfigurado;
  return calcularDescontoVistaPercent(precoVenda, precoParcelado);
}

/** Valor à vista exibido ao cliente no modo parcelado_destaque */
export function calcularPrecoVistaExibicao(
  precoVenda: number,
  precoParcelado: number,
  descontoVistaConfigurado = 0
): number {
  if (descontoVistaConfigurado > 0 && precoParcelado > 0) {
    return precoParcelado * (1 - descontoVistaConfigurado / 100);
  }
  return precoVenda;
}

export function formatDescontoVistaTexto(
  precoVenda: number,
  precoParcelado: number,
  descontoVistaConfigurado = 0
): string {
  const pct = obterDescontoVistaPercent(precoVenda, precoParcelado, descontoVistaConfigurado);
  if (pct <= 0) return '';
  const pctStr = Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace('.', ',');
  return `${pctStr}% de desconto à vista`;
}

export const SAUDE_LABELS: Record<SaudePreco, string> = {
  saudavel: 'Preço saudável',
  apertado: 'Margem apertada',
  insuficiente: 'Margem insuficiente',
};
