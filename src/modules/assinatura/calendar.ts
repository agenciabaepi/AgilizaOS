/** Fuso civil da cobrança (alinha web, API, mobile e Postgres). */
export const ASSINATURA_TZ = 'America/Sao_Paulo';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(value: string | null | undefined): value is string {
  return !!value && YMD_RE.test(value);
}

export function parseYmdParts(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** Compara YYYY-MM-DD como inteiros civis (UTC noon). */
export function ymdToUtcMs(ymd: string): number {
  const { y, m, d } = parseYmdParts(ymd);
  return Date.UTC(y, m - 1, d, 12, 0, 0);
}

export function diffDaysYmd(aYmd: string, bYmd: string): number {
  return Math.round((ymdToUtcMs(aYmd) - ymdToUtcMs(bYmd)) / 86_400_000);
}

export function addDaysYmd(ymd: string, days: number): string {
  const { y, m, d } = parseYmdParts(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatUtcYmd(dt);
}

export function addMonthsKeepingDay(ymd: string, months: number, dayOfMonth: number): string {
  const { y, m } = parseYmdParts(ymd);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1, 12, 0, 0));
  const lastDay = daysInMonth(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
  const day = Math.min(Math.max(1, dayOfMonth), lastDay);
  dt.setUTCDate(day);
  return formatUtcYmd(dt);
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0, 12, 0, 0)).getUTCDate();
}

export function formatUtcYmd(dt: Date): string {
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** YYYY-MM-DD civil no fuso informado. */
export function hojeYmd(agora: Date = new Date(), timeZone: string = ASSINATURA_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) {
    return formatUtcYmd(agora);
  }
  return `${y}-${m}-${d}`;
}

/** Extrai YYYY-MM-DD de ISO ou YMD; datas com hora usam o fuso da cobrança. */
export function toYmd(
  value: string | Date | null | undefined,
  timeZone: string = ASSINATURA_TZ
): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return hojeYmd(value, timeZone);
  }
  const s = String(value).trim();
  if (isYmd(s.slice(0, 10)) && s.length === 10) return s.slice(0, 10);
  const head = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head && !s.includes('T') && !s.includes(' ')) return head[1];
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return hojeYmd(dt, timeZone);
}

/** Noon UTC ISO para gravar data civil sem flip de fuso. */
export function ymdToIsoNoon(ymd: string): string {
  return `${ymd.slice(0, 10)}T12:00:00.000Z`;
}

export function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
