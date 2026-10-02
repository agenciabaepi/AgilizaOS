-- Histórico do assistente do WhatsApp do sistema (conversa com técnicos)
CREATE TABLE IF NOT EXISTS whatsapp_sistema_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('user', 'assistant')),
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sistema_mensagens_telefone
  ON whatsapp_sistema_mensagens (telefone, created_at DESC);

ALTER TABLE whatsapp_sistema_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full whatsapp_sistema_mensagens" ON whatsapp_sistema_mensagens;
CREATE POLICY "Service role full whatsapp_sistema_mensagens" ON whatsapp_sistema_mensagens
  FOR ALL TO service_role USING (true) WITH CHECK (true);
