-- Sessão do técnico no WhatsApp do sistema: verificação por senha (vale até o fim do dia)
-- e ação aguardando confirmação (laudo, status).
CREATE TABLE IF NOT EXISTS whatsapp_sistema_sessoes (
  telefone text PRIMARY KEY,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  verificado_ate timestamptz,
  aguardando_senha boolean NOT NULL DEFAULT false,
  mensagem_pendente text,
  tentativas_senha int NOT NULL DEFAULT 0,
  bloqueado_ate timestamptz,
  acao_pendente jsonb,
  acao_expira_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Reentrega da Meta: a mesma mensagem (ex.: a da senha) não pode ser processada duas vezes
-- NOT NULL: o filtro de reentrega usa neq, que não casa com NULL
ALTER TABLE whatsapp_sistema_sessoes ADD COLUMN IF NOT EXISTS ultima_mensagem_id text NOT NULL DEFAULT '';

ALTER TABLE whatsapp_sistema_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full whatsapp_sistema_sessoes" ON whatsapp_sistema_sessoes;
CREATE POLICY "Service role full whatsapp_sistema_sessoes" ON whatsapp_sistema_sessoes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
