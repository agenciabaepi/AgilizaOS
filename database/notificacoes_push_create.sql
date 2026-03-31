-- Tabela de histórico de notificações push enviadas pelo admin
-- Permite saber quando foi enviada e se/quando o técnico abriu

CREATE TABLE IF NOT EXISTS notificacoes_push (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  mensagem text,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  enviado_por text NOT NULL DEFAULT 'admin',
  aberto_em timestamptz NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_push_auth_user_id ON notificacoes_push(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_push_enviado_em ON notificacoes_push(enviado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_push_aberto_em ON notificacoes_push(aberto_em) WHERE aberto_em IS NOT NULL;

COMMENT ON TABLE notificacoes_push IS 'Histórico de notificações push enviadas pelo admin; aberto_em preenchido quando o técnico abre a notificação no app';

-- RLS
ALTER TABLE notificacoes_push ENABLE ROW LEVEL SECURITY;

-- Técnico pode ver apenas suas notificações e pode atualizar apenas aberto_em (marcar como aberta)
CREATE POLICY "Users can read own notifications"
  ON notificacoes_push FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own opened_at only"
  ON notificacoes_push FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Service role (admin) pode fazer tudo
CREATE POLICY "Service role full access notificacoes_push"
  ON notificacoes_push FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
