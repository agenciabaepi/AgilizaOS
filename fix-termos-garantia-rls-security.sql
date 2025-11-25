-- =====================================================
-- CORREÇÃO CRÍTICA: VAZAMENTO DE TERMOS ENTRE EMPRESAS
-- =====================================================
-- Este script corrige o problema de vazamento de termos de garantia
-- entre empresas diferentes, implementando RLS adequado

-- =====================================================
-- 1. VERIFICAR ESTADO ATUAL DA TABELA
-- =====================================================

-- Verificar se a tabela existe e tem RLS habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'termos_garantia';

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'termos_garantia';

-- =====================================================
-- 2. REMOVER POLÍTICAS INSEGURAS EXISTENTES
-- =====================================================

-- Remover todas as políticas permissivas existentes
DROP POLICY IF EXISTS "termos_garantia_select_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "termos_garantia_insert_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "termos_garantia_update_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "termos_garantia_delete_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "termos_garantia_all_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir select de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir insert de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir update de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir delete de termos_garantia para usuários autenticados" ON public.termos_garantia;

-- =====================================================
-- 3. HABILITAR RLS E CRIAR POLÍTICAS SEGURAS
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.termos_garantia ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. POLÍTICAS SEGURAS POR EMPRESA
-- =====================================================

-- SELECT: Usuários só podem ver termos da própria empresa
CREATE POLICY "termos_garantia_select_empresa_policy" ON public.termos_garantia
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- INSERT: Usuários só podem criar termos para a própria empresa
CREATE POLICY "termos_garantia_insert_empresa_policy" ON public.termos_garantia
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- UPDATE: Usuários só podem atualizar termos da própria empresa
CREATE POLICY "termos_garantia_update_empresa_policy" ON public.termos_garantia
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- DELETE: Usuários só podem deletar termos da própria empresa
CREATE POLICY "termos_garantia_delete_empresa_policy" ON public.termos_garantia
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- =====================================================
-- 5. VERIFICAR APLICAÇÃO DAS POLÍTICAS
-- =====================================================

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'termos_garantia'
ORDER BY policyname;

-- =====================================================
-- 6. TESTE DE SEGURANÇA
-- =====================================================

-- Contar total de termos (deve ser 0 se não há usuário logado)
-- SELECT COUNT(*) as total_termos_visiveis FROM public.termos_garantia;

-- Verificar se RLS está funcionando (descomente para testar)
-- SELECT COUNT(*) as total_termos_visiveis FROM public.termos_garantia;

COMMIT;
