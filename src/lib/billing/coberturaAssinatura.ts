import { diffDiasCalendario } from '@/lib/assinaturaCalendario';
import { isoToYmd, maxCoberturaYmdFromAssinatura } from '@/lib/billing/calcularCoberturaPagamento';

export type AssinaturaCoberturaInput = {
  status?: string | null;
  data_fim?: string | null;
  proxima_cobranca?: string | null;
  data_trial_fim?: string | null;
} | null;

/** Data civil (YYYY-MM-DD) até quando a assinatura está paga. */
export function getCoberturaAteYmd(assinatura: AssinaturaCoberturaInput): string | null {
  return maxCoberturaYmdFromAssinatura(assinatura);
}

export function coberturaYmdParaIso(ymd: string): string {
  return `${ymd.slice(0, 10)}T12:00:00.000Z`;
}

export function diasRestantesCobertura(
  assinatura: AssinaturaCoberturaInput,
  agora = new Date()
): number | null {
  const ymd = getCoberturaAteYmd(assinatura);
  if (!ymd) return null;
  return diffDiasCalendario(ymd, agora);
}

/** Grava a mesma data em `data_fim` e `proxima_cobranca` (fonte única de cobertura). */
export function payloadCoberturaAssinatura(dataFimIso: string) {
  return {
    data_fim: dataFimIso,
    proxima_cobranca: dataFimIso,
  };
}

export function labelStatusAssinatura(params: {
  status?: string | null;
  diasRestantes?: number | null;
  emTesteGratis?: boolean;
}): string {
  const { diasRestantes, emTesteGratis } = params;
  const statusNorm = String(params.status || '').toLowerCase();

  if (statusNorm === 'cancelled') return 'Cancelada';
  if (emTesteGratis) return 'Trial';
  if (diasRestantes !== null && diasRestantes !== undefined && diasRestantes < 0) {
    return 'Vencida';
  }
  if (diasRestantes !== null && diasRestantes !== undefined && diasRestantes >= 0) {
    return 'Ativa';
  }
  if (statusNorm === 'active' || statusNorm === 'ativa') return 'Ativa';
  if (statusNorm === 'trial') return 'Trial';
  if (statusNorm === 'expired') return 'Expirada';
  if (statusNorm === 'suspended') return 'Suspensa';
  return params.status || '—';
}
