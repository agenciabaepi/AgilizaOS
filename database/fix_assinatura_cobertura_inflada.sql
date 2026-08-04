-- Corrige assinaturas com proxima_cobranca/data_fim inflada por sync duplicado
-- ou empilhamento indevido de pagamentos históricos.
-- Último pagamento 16/07/2026 → vencimento correto: 15/08/2026.

UPDATE assinaturas
SET
  proxima_cobranca = '2026-08-15T12:00:00.000Z',
  data_fim = '2026-08-15T12:00:00.000Z',
  updated_at = NOW()
WHERE status IN ('active', 'ativa')
  AND (
    proxima_cobranca::date > '2026-08-15'
    OR data_fim::date > '2026-08-15'
  );
