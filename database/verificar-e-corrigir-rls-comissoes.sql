-- =====================================================
-- VERIFICAR E CORRIGIR RLS NA TABELA comissoes_historico
-- =====================================================
-- Se RLS estiver bloqueando, este script corrige

-- 1. VERIFICAR SE RLS ESTÁ ATIVO
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_ativado
FROM pg_tables
WHERE tablename = 'comissoes_historico';

-- 2. VERIFICAR POLÍTICAS EXISTENTES
-- =====================================================
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'comissoes_historico';

-- 3. DESABILITAR RLS TEMPORARIAMENTE PARA TESTE (se necessário)
-- =====================================================
-- ATENÇÃO: Só execute se RLS estiver bloqueando
-- ALTER TABLE comissoes_historico DISABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICA PERMISSIVA PARA O TRIGGER FUNCIONAR
-- =====================================================
-- Permitir que a função do trigger insira (ela usa SECURITY DEFINER)
DROP POLICY IF EXISTS "Permitir insert de comissoes_historico para trigger" ON comissoes_historico;

-- A função do trigger usa SECURITY DEFINER, então deve conseguir inserir
-- Mas vamos garantir que não há política bloqueando
CREATE POLICY "Permitir insert de comissoes_historico para trigger" 
ON comissoes_historico
FOR INSERT
WITH CHECK (true);  -- Permite qualquer insert

-- 5. VERIFICAR SE A FUNÇÃO TEM PERMISSÃO
-- =====================================================
SELECT 
    proname,
    prosecdef as security_definer,
    proowner::regrole as owner
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 6. GARANTIR QUE A FUNÇÃO TEM PERMISSÃO DE INSERIR
-- =====================================================
-- A função já deve ter permissão por ser SECURITY DEFINER
-- Mas vamos garantir
GRANT INSERT ON comissoes_historico TO postgres;
GRANT INSERT ON comissoes_historico TO service_role;
GRANT INSERT ON comissoes_historico TO authenticated;

