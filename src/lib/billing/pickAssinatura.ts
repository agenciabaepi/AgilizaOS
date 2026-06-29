import { diffDiasCalendario } from '@/lib/assinaturaCalendario';
import { dataFimTrialAPartirDe } from '@/config/trial';

/** Trial ainda dentro do período (último dia civil incluso). */
export function trialRowCalendarValid(
  row: Record<string, unknown>,
  empresaCreatedAt: string | null | undefined,
  empresaDiasTrial?: number | null
): boolean {
  if (String(row.status) !== 'trial') return false;
  const dtf = row.data_trial_fim as string | null | undefined;
  if (dtf) {
    const d = diffDiasCalendario(dtf);
    return d !== null && d >= 0;
  }
  const created = typeof empresaCreatedAt === 'string' ? empresaCreatedAt.trim() : '';
  if (!created) return false;
  const end = dataFimTrialAPartirDe(created, empresaDiasTrial);
  if (!end) return false;
  const d = diffDiasCalendario(end);
  return d !== null && d >= 0;
}

/** Assinatura ativa com data fim / próxima cobrança ainda ok (dias civis locais). */
export function activeRowCalendarValid(row: Record<string, unknown>): boolean {
  if (String(row.status) !== 'active') return false;
  if (row.data_fim) {
    const d0 = diffDiasCalendario(row.data_fim as string);
    if (d0 !== null && d0 < 0) return false;
  }
  if (row.proxima_cobranca) {
    const d = diffDiasCalendario(row.proxima_cobranca as string);
    if (d !== null && d < 0) return false;
  }
  return true;
}

/**
 * Escolhe a linha de `assinaturas` que deve governar o app (plano / trial na UI e limites).
 * Evita que uma linha mais recente (ex.: cancelada) esconda um trial ainda válido.
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

  const validTrial = sorted.find((r) => trialRowCalendarValid(r, empresaCreatedAt, empresaDiasTrial));
  if (validTrial) return validTrial;

  const validActive = sorted.find((r) => activeRowCalendarValid(r));
  if (validActive) return validActive;

  return sorted[0];
}
