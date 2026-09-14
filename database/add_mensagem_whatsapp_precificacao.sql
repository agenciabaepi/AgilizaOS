-- Texto padrão do orçamento da calculadora (WhatsApp e cupom)
-- Execute no Supabase SQL Editor

ALTER TABLE configuracoes_precificacao
  ADD COLUMN IF NOT EXISTS mensagem_whatsapp text NOT NULL DEFAULT '';

COMMENT ON COLUMN configuracoes_precificacao.mensagem_whatsapp IS
  'Texto extra do orçamento enviado pelo WhatsApp e impresso no cupom. Variáveis: {{cliente}}, {{aparelho}}';
