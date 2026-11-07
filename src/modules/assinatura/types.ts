export type FaseAssinatura = 'trial' | 'prorata' | 'mensal' | 'bloqueado';

export type StatusAssinatura =
  | 'trial'
  | 'active'
  | 'pending_payment'
  | 'expired'
  | 'cancelled'
  | 'suspended';

export type TipoCobranca = 'prorata' | 'mensal';

export type AssinaturaSnapshot = {
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  data_trial_fim?: string | null;
  proxima_cobranca?: string | null;
  valor?: number | null;
  sistema_liberado?: boolean | null;
};

export type ResultadoRenovacao = {
  tipo: TipoCobranca;
  vencimentoYmd: string;
  dataFimIso: string;
  noPrazo: boolean;
  diasProrata?: number;
  valorCobrado?: number;
};
