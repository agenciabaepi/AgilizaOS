-- Calculadora de precificação por empresa
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS configuracoes_precificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  markup_percent numeric(8, 2) NOT NULL DEFAULT 0,
  imposto_percent numeric(8, 2) NOT NULL DEFAULT 0,
  juros_parcelamento_percent numeric(8, 2) NOT NULL DEFAULT 0,
  frete_valor numeric(12, 2) NOT NULL DEFAULT 0,
  configurado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

COMMENT ON TABLE configuracoes_precificacao IS 'Parâmetros da calculadora de precificação por empresa';
COMMENT ON COLUMN configuracoes_precificacao.markup_percent IS 'Markup sobre a peça (%)';
COMMENT ON COLUMN configuracoes_precificacao.imposto_percent IS 'Imposto (%)';
COMMENT ON COLUMN configuracoes_precificacao.juros_parcelamento_percent IS 'Juros de parcelamento (%)';
COMMENT ON COLUMN configuracoes_precificacao.frete_valor IS 'Frete fixo por peça (R$)';
COMMENT ON COLUMN configuracoes_precificacao.configurado IS 'Indica se a empresa já configurou a calculadora';

ALTER TABLE configuracoes_precificacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver precificação da própria empresa" ON configuracoes_precificacao;
DROP POLICY IF EXISTS "Usuários podem inserir precificação na própria empresa" ON configuracoes_precificacao;
DROP POLICY IF EXISTS "Usuários podem atualizar precificação da própria empresa" ON configuracoes_precificacao;

CREATE POLICY "Usuários podem ver precificação da própria empresa" ON configuracoes_precificacao
  FOR SELECT USING (
    empresa_id IN (
      SELECT u.empresa_id FROM usuarios u
      WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir precificação na própria empresa" ON configuracoes_precificacao
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT u.empresa_id FROM usuarios u
      WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar precificação da própria empresa" ON configuracoes_precificacao
  FOR UPDATE USING (
    empresa_id IN (
      SELECT u.empresa_id FROM usuarios u
      WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
    )
  );

-- Permissões de acesso à tabela
GRANT SELECT, INSERT, UPDATE ON configuracoes_precificacao TO authenticated;
GRANT ALL ON configuracoes_precificacao TO service_role;
