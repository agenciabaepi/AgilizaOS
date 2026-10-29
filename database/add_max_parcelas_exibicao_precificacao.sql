-- Quantidade máxima de parcelas exibida na tabela de precificação (cupom / WhatsApp / calculadora)
-- Execute no Supabase SQL Editor se a migration automática não tiver sido aplicada

ALTER TABLE configuracoes_precificacao
  ADD COLUMN IF NOT EXISTS max_parcelas_exibicao integer NOT NULL DEFAULT 12;

ALTER TABLE configuracoes_precificacao
  DROP CONSTRAINT IF EXISTS configuracoes_precificacao_max_parcelas_exibicao_check;

ALTER TABLE configuracoes_precificacao
  ADD CONSTRAINT configuracoes_precificacao_max_parcelas_exibicao_check
  CHECK (max_parcelas_exibicao >= 2 AND max_parcelas_exibicao <= 12);

COMMENT ON COLUMN configuracoes_precificacao.max_parcelas_exibicao IS
  'Máximo de parcelas a exibir na tabela de precificação (2 a 12)';
