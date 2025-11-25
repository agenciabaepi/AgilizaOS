-- =====================================================
-- FIX RLS PARA TABELA OS_HISTORICO
-- =====================================================
-- Este script corrige o problema de loading infinito
-- criando as políticas RLS necessárias

-- 1. Habilitar RLS na tabela os_historico
ALTER TABLE public.os_historico ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "os_historico_select_empresa_policy" ON public.os_historico;
DROP POLICY IF EXISTS "os_historico_insert_empresa_policy" ON public.os_historico;
DROP POLICY IF EXISTS "os_historico_update_empresa_policy" ON public.os_historico;
DROP POLICY IF EXISTS "os_historico_delete_empresa_policy" ON public.os_historico;

-- 3. Política para SELECT: Usuários podem ver histórico das OS da sua empresa
CREATE POLICY "os_historico_select_empresa_policy" ON public.os_historico
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
        )
    );

-- 4. Política para INSERT: Sistema pode inserir registros de histórico
CREATE POLICY "os_historico_insert_empresa_policy" ON public.os_historico
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
        )
    );

-- 5. Política para UPDATE: Não permitir updates (histórico é imutável)
-- CREATE POLICY "os_historico_update_empresa_policy" ON public.os_historico
--     FOR UPDATE 
--     USING (false);

-- 6. Política para DELETE: Não permitir deletes (histórico é permanente)
-- CREATE POLICY "os_historico_delete_empresa_policy" ON public.os_historico
--     FOR DELETE 
--     USING (false);

-- 7. Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'os_historico'
ORDER BY policyname;

-- 8. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'os_historico';

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase Dashboard
-- 2. Vá em Database > SQL Editor
-- 3. Cole este código e clique em "Run"
-- 4. Verifique se as políticas foram criadas
-- =====================================================
