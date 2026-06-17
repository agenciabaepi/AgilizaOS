-- Modo de exibição de preços para o cliente (cupom / WhatsApp)
-- Execute no Supabase SQL Editor

ALTER TABLE configuracoes_precificacao
  ADD COLUMN IF NOT EXISTS modo_exibicao_cliente text NOT NULL DEFAULT 'separado';

ALTER TABLE configuracoes_precificacao
  DROP CONSTRAINT IF EXISTS configuracoes_precificacao_modo_exibicao_cliente_check;

ALTER TABLE configuracoes_precificacao
  ADD CONSTRAINT configuracoes_precificacao_modo_exibicao_cliente_check
  CHECK (modo_exibicao_cliente IN ('separado', 'parcelado_destaque'));

COMMENT ON COLUMN configuracoes_precificacao.modo_exibicao_cliente IS
  'separado: à vista e parcelado separados; parcelado_destaque: valor parcelado em destaque com % desconto à vista';

ALTER TABLE configuracoes_precificacao
  ADD COLUMN IF NOT EXISTS desconto_vista_percent numeric(8, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN configuracoes_precificacao.desconto_vista_percent IS
  'Percentual de desconto à vista exibido ao cliente no modo parcelado_destaque (0 = calcula automaticamente)';
