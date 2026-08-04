-- Idempotência: cada pagamento só pode estender a assinatura uma vez.
-- Execute no Supabase SQL Editor.

ALTER TABLE pagamentos
  ADD COLUMN IF NOT EXISTS cobertura_aplicada_ate DATE,
  ADD COLUMN IF NOT EXISTS assinatura_aplicada_em TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_pagamentos_assinatura_aplicada
  ON pagamentos (empresa_id, assinatura_aplicada_em DESC)
  WHERE assinatura_aplicada_em IS NOT NULL;

COMMENT ON COLUMN pagamentos.cobertura_aplicada_ate IS 'Último dia de cobertura concedido por este pagamento (YYYY-MM-DD civil)';
-- Backfill: pagamentos já aprovados herdam cobertura atual da assinatura
UPDATE pagamentos p
SET
  cobertura_aplicada_ate = COALESCE(a.proxima_cobranca, a.data_fim)::date,
  assinatura_aplicada_em = COALESCE(p.paid_at, p.created_at, NOW())
FROM assinaturas a
WHERE p.empresa_id = a.empresa_id
  AND p.status = 'approved'
  AND p.assinatura_aplicada_em IS NULL
  AND a.status IN ('active', 'ativa')
  AND COALESCE(a.proxima_cobranca, a.data_fim) IS NOT NULL;
