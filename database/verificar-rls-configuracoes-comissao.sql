-- =====================================================
-- VERIFICAR E CRIAR RLS PARA configuracoes_comissao
-- =====================================================
-- Execute este script para verificar e criar políticas RLS

-- 1. VERIFICAR SE A TABELA EXISTE E TEM RLS HABILITADO
-- =====================================================
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'configuracoes_comissao';

-- 2. VERIFICAR POLÍTICAS RLS EXISTENTES
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operacao,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'configuracoes_comissao';

-- 3. HABILITAR RLS SE NÃO ESTIVER HABILITADO
-- =====================================================
ALTER TABLE configuracoes_comissao ENABLE ROW LEVEL SECURITY;

-- 4. REMOVER POLÍTICAS ANTIGAS (SE EXISTIREM)
-- =====================================================
DROP POLICY IF EXISTS "Usuários podem ver configurações da própria empresa" ON configuracoes_comissao;
DROP POLICY IF EXISTS "Usuários podem inserir configurações na própria empresa" ON configuracoes_comissao;
DROP POLICY IF EXISTS "Usuários podem atualizar configurações da própria empresa" ON configuracoes_comissao;
DROP POLICY IF EXISTS "Usuários podem deletar configurações da própria empresa" ON configuracoes_comissao;

-- 5. CRIAR POLÍTICAS RLS
-- =====================================================
-- SELECT: Usuários podem ver configurações da própria empresa
CREATE POLICY "Usuários podem ver configurações da própria empresa" ON configuracoes_comissao
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- INSERT: Usuários podem inserir configurações na própria empresa
CREATE POLICY "Usuários podem inserir configurações na própria empresa" ON configuracoes_comissao
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- UPDATE: Usuários podem atualizar configurações da própria empresa
CREATE POLICY "Usuários podem atualizar configurações da própria empresa" ON configuracoes_comissao
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- DELETE: Usuários podem deletar configurações da própria empresa (opcional)
CREATE POLICY "Usuários podem deletar configurações da própria empresa" ON configuracoes_comissao
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- 6. VERIFICAR SE AS POLÍTICAS FORAM CRIADAS
-- =====================================================
SELECT 
    policyname,
    cmd as operacao
FROM pg_policies
WHERE tablename = 'configuracoes_comissao';
