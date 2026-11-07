import { ASSINATURA_TZ, hojeYmd, toYmd } from './calendar';
import { calcularDataFimTrialYmd, trialAindaVigente } from './trial';
import { coberturaMensalVigente } from './vencimentoDia10';
import type { AssinaturaSnapshot, FaseAssinatura } from './types';

export type DecisaoAcesso = {
  liberado: boolean;
  fase: FaseAssinatura;
  motivo: string;
  vencimentoYmd: string | null;
  trialFimYmd: string | null;
};

function maxYmd(a: string | null, b: string | null): string | null {
  if (a && b) return a >= b ? a : b;
  return a || b;
}

/**
 * Única regra de liberação de acesso.
 * - sistema_liberado → libera
 * - trial vigente → libera
 * - cobertura paga (hoje <= data_fim dia 10) → libera
 * - senão → bloqueado (pró-rata sem pagamento / vencido)
 *
 * data_fim e proxima_cobranca: usa o maior YMD (devem ser iguais no sistema novo).
 */
export function decidirAcesso(params: {
  assinatura?: AssinaturaSnapshot | null;
  empresaCreatedAt?: string | null;
  sistemaLiberado?: boolean | null;
  agora?: Date;
  timeZone?: string;
}): DecisaoAcesso {
  const tz = params.timeZone ?? ASSINATURA_TZ;
  const hoje = hojeYmd(params.agora ?? new Date(), tz);

  if (params.sistemaLiberado === true || params.assinatura?.sistema_liberado === true) {
    return {
      liberado: true,
      fase: 'mensal',
      motivo: 'sistema_liberado',
      vencimentoYmd: null,
      trialFimYmd: null,
    };
  }

  const status = String(params.assinatura?.status || '').toLowerCase();
  if (status === 'cancelled' || status === 'canceled' || status === 'suspended') {
    return {
      liberado: false,
      fase: 'bloqueado',
      motivo: `status_${status}`,
      vencimentoYmd: null,
      trialFimYmd: toYmd(params.assinatura?.data_trial_fim, tz),
    };
  }

  const trialFimExplícito = toYmd(params.assinatura?.data_trial_fim, tz);
  const inicio =
    toYmd(params.assinatura?.data_inicio, tz) || toYmd(params.empresaCreatedAt, tz);
  const trialFim =
    trialFimExplícito ||
    (inicio && (status === 'trial' || status === '' || !params.assinatura)
      ? calcularDataFimTrialYmd(inicio)
      : null);

  const vencimento = maxYmd(
    toYmd(params.assinatura?.data_fim, tz),
    toYmd(params.assinatura?.proxima_cobranca, tz)
  );

  if (vencimento && coberturaMensalVigente({ vencimentoYmd: vencimento, hojeYmd: hoje })) {
    return {
      liberado: true,
      fase: 'mensal',
      motivo: 'cobertura_paga',
      vencimentoYmd: vencimento,
      trialFimYmd: trialFim,
    };
  }

  if (trialFim && trialAindaVigente({ dataTrialFimYmd: trialFim, hojeYmd: hoje })) {
    return {
      liberado: true,
      fase: 'trial',
      motivo: 'trial_vigente',
      vencimentoYmd: vencimento,
      trialFimYmd: trialFim,
    };
  }

  if (trialFim && hoje > trialFim && !vencimento) {
    return {
      liberado: false,
      fase: 'prorata',
      motivo: 'aguardando_prorata',
      vencimentoYmd: null,
      trialFimYmd: trialFim,
    };
  }

  if (status === 'pending_payment') {
    return {
      liberado: false,
      fase: 'prorata',
      motivo: 'pending_payment',
      vencimentoYmd: vencimento,
      trialFimYmd: trialFim,
    };
  }

  return {
    liberado: false,
    fase: 'bloqueado',
    motivo: vencimento ? 'vencido' : 'sem_cobertura',
    vencimentoYmd: vencimento,
    trialFimYmd: trialFim,
  };
}

export function temAcesso(params: Parameters<typeof decidirAcesso>[0]): boolean {
  return decidirAcesso(params).liberado;
}
