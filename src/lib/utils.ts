import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** YYYY-MM no fuso local (evita deslocamento de toISOString/UTC). */
export function toMesISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** YYYY-MM-DD no calendário local. */
export function toDateISO(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    .toISOString()
    .slice(0, 10);
}

/** Período completo de um mês (mes = 1–12). */
export function getPeriodoMes(ano: number, mes: number): { dataInicio: string; dataFim: string } {
  return {
    dataInicio: toDateISO(new Date(ano, mes - 1, 1)),
    dataFim: toDateISO(new Date(ano, mes, 0)),
  };
}

export function getPeriodoMesFromString(mesString: string): { dataInicio: string; dataFim: string } {
  const [ano, mes] = mesString.split('-').map(Number);
  return getPeriodoMes(ano, mes);
}

export function parseValorMonetario(valor: unknown): number {
  if (typeof valor === 'number' && !Number.isNaN(valor)) return valor;
  if (typeof valor === 'string') {
    const n = parseFloat(valor.replace(',', '.'));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se já tem código do país (55), retorna como está
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned;
  }
  
  // Se tem 11 dígitos (DDD + 9 dígitos), adiciona código do país
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  // Se tem 10 dígitos (DDD + 8 dígitos), adiciona código do país
  if (cleaned.length === 10) {
    return `55${cleaned}`;
  }
  
  return null;
}

/**
 * Remove tags HTML e converte entidades HTML para texto simples
 * Útil para renderizar HTML em locais que não suportam HTML (como PDF)
 */
export function stripHTML(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<[^>]*>/g, '') // Remove todas as tags HTML
    .replace(/&nbsp;/g, ' ') // Converte &nbsp; para espaço
    .replace(/&amp;/g, '&') // Converte &amp; para &
    .replace(/&lt;/g, '<') // Converte &lt; para <
    .replace(/&gt;/g, '>') // Converte &gt; para >
    .replace(/&quot;/g, '"') // Converte &quot; para "
    .replace(/&#39;/g, "'") // Converte &#39; para '
    .replace(/\s+/g, ' ') // Remove espaços múltiplos
    .trim();
}
