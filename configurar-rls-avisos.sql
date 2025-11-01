-- =====================================================
-- CONFIGURAR RLS PARA TABELA DE AVISOS
-- =====================================================
-- Execute este script se a tabela já foi criada mas está dando erro de permissão

-- Habilitar RLS (se ainda não estiver habilitado)
ALTER TABLE avisos_sistema ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (para recriar)
DROP POLICY IF EXISTS "Usuários podem ver avisos da própria empresa" ON avisos_sistema;
DROP POLICY IF EXISTS "Usuários podem inserir avisos na própria empresa" ON avisos_sistema;
DROP POLICY IF EXISTS "Usuários podem atualizar avisos da própria empresa" ON avisos_sistema;
DROP POLICY IF EXISTS "Usuários podem deletar avisos da própria empresa" ON avisos_sistema;

-- Política para SELECT (ver avisos)
CREATE POLICY "Usuários podem ver avisos da própria empresa" 
  ON avisos_sistema FOR SELECT 
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Política para INSERT (criar avisos)
CREATE POLICY "Usuários podem inserir avisos na própria empresa" 
  ON avisos_sistema FOR INSERT 
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Política para UPDATE (atualizar avisos)
CREATE POLICY "Usuários podem atualizar avisos da própria empresa" 
  ON avisos_sistema FOR UPDATE 
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Política para DELETE (deletar avisos)
CREATE POLICY "Usuários podem deletar avisos da própria empresa" 
  ON avisos_sistema FOR DELETE 
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- NOTA: Como a API usa service_role_key (createAdminClient), essas políticas
-- são bypassadas. Mas é bom ter para segurança caso mude no futuro.

