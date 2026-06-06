export interface ConfiguracaoPrecificacao {
  markup_percent: number;
  imposto_percent: number;
  juros_parcelamento_percent: number;
  frete_valor: number;
  configurado: boolean;
}

export type SaudePreco = 'saudavel' | 'apertado' | 'insuficiente';

export interface ResultadoPrecificacao {
  precoVenda: number;
  precoParcelado: number;
  lucroBruto: number;
  margemBrutaPercent: number;
  saude: SaudePreco;
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
  const juros = config.juros_parcelamento_percent / 100;

  const baseComFrete = custoSeguro + frete;
  const precoPeca = baseComFrete * (1 + markup) * (1 + imposto);
  const precoVenda = precoPeca + maoDeObraSegura;
  const precoParcelado = precoVenda * (1 + juros);
  const lucroBruto = precoVenda - custoSeguro - frete;
  const margemBrutaPercent = precoVenda > 0 ? (lucroBruto / precoVenda) * 100 : 0;

  let saude: SaudePreco = 'insuficiente';
  if (margemBrutaPercent >= 20 && lucroBruto > 0) {
    saude = 'saudavel';
  } else if (margemBrutaPercent >= 10 && lucroBruto > 0) {
    saude = 'apertado';
  }

  return {
    precoVenda,
    precoParcelado,
    lucroBruto,
    margemBrutaPercent,
    saude,
  };
}

export const SAUDE_LABELS: Record<SaudePreco, string> = {
  saudavel: 'Preço saudável',
  apertado: 'Margem apertada',
  insuficiente: 'Margem insuficiente',
};
