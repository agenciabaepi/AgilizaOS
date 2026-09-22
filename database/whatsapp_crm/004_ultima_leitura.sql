-- Leitura confiável do inbox (evita badge voltar após reload)
-- Execute no Supabase SQL Editor

ALTER TABLE whatsapp_conversas
  ADD COLUMN IF NOT EXISTS ultima_leitura_em timestamptz;

COMMENT ON COLUMN whatsapp_conversas.ultima_leitura_em IS
  'Momento em que a conversa foi aberta/lida no inbox; nao_lidas = msgs de entrada após este instante';

-- Zera badges atuais: considera tudo já lido até agora
UPDATE whatsapp_conversas
SET
  nao_lidas = 0,
  ultima_leitura_em = COALESCE(ultima_mensagem_em, now(), created_at)
WHERE ultima_leitura_em IS NULL OR nao_lidas > 0;
