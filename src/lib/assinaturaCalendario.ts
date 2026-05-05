function ymdInTimeZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !day) return '';
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Diferença em dias civis (horário local): dataRef − hoje.
 * 0 = mesmo dia; <0 = data já passou.
 */
export function diffDiasCalendario(dataRefIso: string | null | undefined, agora = new Date()): number | null {
  if (!dataRefIso) return null;
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  const ref = new Date(dataRefIso);
  if (Number.isNaN(ref.getTime())) return null;
  ref.setHours(0, 0, 0, 0);
  return Math.ceil((ref.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Mesma semântica que {@link diffDiasCalendario}, mas datas civis no fuso IANA informado
 * (uso em servidor / APIs para coincidir com `timezone('...', now())` no Postgres).
 */
export function diffDiasCalendarioInTimeZone(
  dataRefIso: string | null | undefined,
  timeZone: string,
  agora = new Date()
): number | null {
  if (!dataRefIso) return null;
  const ref = new Date(dataRefIso);
  if (Number.isNaN(ref.getTime())) return null;
  const refYmd = ymdInTimeZone(ref, timeZone);
  const hojeYmd = ymdInTimeZone(agora, timeZone);
  if (!refYmd || !hojeYmd) return null;
  const diffMs = parseYmd(refYmd) - parseYmd(hojeYmd);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
