-- =====================================================
-- CORREÇÃO CRÍTICA: VAZAMENTO DE TERMOS ENTRE EMPRESAS
-- =====================================================
-- Script simplificado para corrigir RLS da tabela termos_garantia

-- =====================================================
-- 1. REMOVER POLÍTICAS INSEGURAS EXISTENTES
-- =====================================================
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
-- 2. HABILITAR RLS
-- =====================================================
ALTER TABLE public.termos_garantia ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CRIAR POLÍTICAS SEGURAS POR EMPRESA
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
-- 4. VERIFICAR POLÍTICAS CRIADAS
-- =====================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'termos_garantia'
ORDER BY policyname;
