const MAX_DIGITS = 11;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Formata um número como Real: 1234.56 → "1.234,56" */
export function formatCurrencyNumber(
  value: number,
  options?: { withSymbol?: boolean }
): string {
  const n = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return options?.withSymbol ? `R$ ${formatted}` : formatted;
}

/**
 * Converte texto/número em valor monetário.
 * Aceita máscara BR ("1.234,56"), US ("1234.56") e prefixo R$.
 */
export function parseCurrencyNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? round2(value) : 0;
  if (value == null) return 0;
  const s = String(value).replace(/R\$\s?/gi, '').trim();
  if (!s) return 0;
  if (s.includes(',')) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? round2(n) : 0;
  }
  const n = parseFloat(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? round2(n) : 0;
}

/**
 * Máscara de digitação por centavos: 1 → "0,01" → "0,12" → "1,23" → "12,34" → "1.234,56"
 */
export function maskCurrencyInput(raw: string, options?: { withSymbol?: boolean }): string {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, MAX_DIGITS);
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents) || cents === 0) return '';
  return formatCurrencyNumber(cents / 100, options);
}

/** Valor controlado exibido no input (vazio quando 0). */
export function formatCurrencyInputValue(
  value: string | number | null | undefined,
  options?: { withSymbol?: boolean }
): string {
  if (value === '' || value == null) return '';
  const n = parseCurrencyNumber(value);
  if (n === 0) return '';
  return formatCurrencyNumber(n, options);
}
