import { diffDiasCalendario, diffDiasCalendarioInTimeZone } from '@/lib/assinaturaCalendario';
import { dataFimTrialAPartirDe } from '@/config/trial';
import { getCoberturaAteYmd } from '@/lib/billing/coberturaAssinatura';

function diffCalendario(
  iso: string | null | undefined,
  timeZone?: string
): number | null {
  if (timeZone) return diffDiasCalendarioInTimeZone(iso, timeZone);
  return diffDiasCalendario(iso);
}

/** Trial ainda dentro do período (último dia civil incluso). */
export function trialRowCalendarValid(
  row: Record<string, unknown>,
  empresaCreatedAt: string | null | undefined,
  empresaDiasTrial?: number | null,
  timeZone?: string
): boolean {
  if (String(row.status) !== 'trial') return false;
  const dtf = row.data_trial_fim as string | null | undefined;
  if (dtf) {
    const d = diffCalendario(dtf, timeZone);
    return d !== null && d >= 0;
  }
  const created = typeof empresaCreatedAt === 'string' ? empresaCreatedAt.trim() : '';
  if (!created) return false;
  const end = dataFimTrialAPartirDe(created, empresaDiasTrial);
  if (!end) return false;
  const d = diffCalendario(end, timeZone);
  return d !== null && d >= 0;
}

/** Assinatura ativa com data fim / próxima cobrança ainda ok (dias civis). */
export function activeRowCalendarValid(
  row: Record<string, unknown>,
  timeZone?: string
): boolean {
  const status = String(row.status || '');
  if (status !== 'active' && status !== 'ativa') return false;
  if (row.data_fim) {
    const d0 = diffCalendario(row.data_fim as string, timeZone);
    if (d0 !== null && d0 < 0) return false;
  }
  if (row.proxima_cobranca) {
    const d = diffCalendario(row.proxima_cobranca as string, timeZone);
    if (d !== null && d < 0) return false;
  }
  return true;
}

/**
 * Escolhe a linha de `assinaturas` que deve governar o app (plano / trial na UI e limites).
 * Prioridade: cobertura paga vigente > trial válido > active válido > mais recente.
 * (Antes o trial ganhava de assinatura paga e podia esconder o plano correto.)
 */
export function pickAssinaturaParaContexto(
  rows: Record<string, unknown>[],
  empresaCreatedAt: string | null | undefined,
  empresaDiasTrial?: number | null
): Record<string, unknown> | null {
  if (!rows?.length) return null;
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime()
  );

  const comCobertura = sorted
    .filter((r) => String(r.status || '').toLowerCase() !== 'cancelled')
    .map((r) => ({ r, cob: getCoberturaAteYmd(r) }))
    .filter((x): x is { r: Record<string, unknown>; cob: string } => !!x.cob)
    .sort((a, b) => b.cob.localeCompare(a.cob));

  const vigentePaga = comCobertura.find((x) => {
    const status = String(x.r.status || '').toLowerCase();
    if (status === 'trial') return false;
    const d = diffDiasCalendario(x.cob);
    return d !== null && d >= 0;
  });
  if (vigentePaga) return vigentePaga.r;

  const validTrial = sorted.find((r) =>
    trialRowCalendarValid(r, empresaCreatedAt, empresaDiasTrial)
  );
  if (validTrial) return validTrial;

  const vigenteQualquer = comCobertura.find((x) => {
    const d = diffDiasCalendario(x.cob);
    return d !== null && d >= 0;
  });
  if (vigenteQualquer) return vigenteQualquer.r;

  const validActive = sorted.find((r) => activeRowCalendarValid(r));
  if (validActive) return validActive;

  return sorted[0];
}
