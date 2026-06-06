-- Corrige RLS e permissões da calculadora de precificação
-- Execute no Supabase SQL Editor se o salvamento não funcionar

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

GRANT SELECT, INSERT, UPDATE ON configuracoes_precificacao TO authenticated;
GRANT ALL ON configuracoes_precificacao TO service_role;
