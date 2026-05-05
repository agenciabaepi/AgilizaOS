/** Fuso usado em regras de trial/vencimento (alinha servidor e Postgres). */
export const BILLING_TIME_ZONE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BILLING_TZ) || 'America/Sao_Paulo';
