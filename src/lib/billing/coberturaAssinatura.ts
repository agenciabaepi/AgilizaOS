import { diffDiasCalendario } from '@/lib/assinaturaCalendario';
import { toYmd, ymdToIsoNoon } from '@/modules/assinatura';

export type AssinaturaCoberturaInput = {
  status?: string | null;
  data_fim?: string | null;
  proxima_cobranca?: string | null;
  data_trial_fim?: string | null;
};

export function getCoberturaAteYmd(
  assinatura: AssinaturaCoberturaInput | null | undefined
): string | null {
  if (!assinatura) return null;
  const a = toYmd(assinatura.data_fim);
  const b = toYmd(assinatura.proxima_cobranca);
  if (a && b) return a >= b ? a : b;
  return a || b;
}

export function coberturaYmdParaIso(ymd: string): string {
  return ymdToIsoNoon(ymd);
}

export function payloadCoberturaAssinatura(coberturaYmd: string) {
  const iso = coberturaYmdParaIso(coberturaYmd);
  return { data_fim: iso, proxima_cobranca: iso };
}

export function diasRestantesCobertura(
  assinatura: AssinaturaCoberturaInput | null | undefined,
  agora: Date = new Date()
): number | null {
  const ymd = getCoberturaAteYmd(assinatura);
  if (!ymd) return null;
  return diffDiasCalendario(ymd, agora);
}

export function labelStatusAssinatura(params: {
  status?: string | null;
  diasRestantes?: number | null;
  emTesteGratis?: boolean;
}): string {
  if (params.emTesteGratis) return 'Período de teste';
  const st = String(params.status || '').toLowerCase();
  if (st === 'cancelled' || st === 'canceled') return 'Cancelada';
  if (params.diasRestantes != null && params.diasRestantes < 0) return 'Vencida';
  if (st === 'pending_payment') return 'Aguardando pagamento';
  if (st === 'active' || st === 'ativa') return 'Ativa';
  if (st === 'trial') return 'Teste';
  return st || '—';
}
