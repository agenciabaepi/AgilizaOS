-- =====================================================
-- CORREÇÃO RLS COM POLÍTICAS CORRETAS - MANTER SEGURANÇA
-- =====================================================
-- Este script re-habilita o RLS com políticas adequadas que permitem
-- as operações necessárias mantendo a segurança

-- =====================================================
-- 1. RE-HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos_tipos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CRIAR POLÍTICAS RLS ADEQUADAS PARA ORDENS_SERVICO
-- =====================================================

-- Política para SELECT - permitir leitura para usuários autenticados
CREATE POLICY "ordens_servico_select_policy" ON public.ordens_servico
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Política para INSERT - permitir criação para usuários autenticados
CREATE POLICY "ordens_servico_insert_policy" ON public.ordens_servico
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE - permitir atualização para usuários autenticados
CREATE POLICY "ordens_servico_update_policy" ON public.ordens_servico
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Política para DELETE - permitir exclusão para usuários autenticados
CREATE POLICY "ordens_servico_delete_policy" ON public.ordens_servico
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- =====================================================
-- 3. CRIAR POLÍTICAS RLS PARA USUARIOS
-- =====================================================

CREATE POLICY "usuarios_select_policy" ON public.usuarios
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios_insert_policy" ON public.usuarios
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "usuarios_update_policy" ON public.usuarios
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "usuarios_delete_policy" ON public.usuarios
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. CRIAR POLÍTICAS RLS PARA CLIENTES
-- =====================================================

CREATE POLICY "clientes_select_policy" ON public.clientes
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "clientes_insert_policy" ON public.clientes
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "clientes_update_policy" ON public.clientes
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "clientes_delete_policy" ON public.clientes
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. CRIAR POLÍTICAS RLS PARA EMPRESAS
-- =====================================================

CREATE POLICY "empresas_select_policy" ON public.empresas
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "empresas_insert_policy" ON public.empresas
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "empresas_update_policy" ON public.empresas
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "empresas_delete_policy" ON public.empresas
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- =====================================================
-- 6. CRIAR POLÍTICAS RLS PARA STATUS_HISTORICO
-- =====================================================

CREATE POLICY "status_historico_select_policy" ON public.status_historico
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "status_historico_insert_policy" ON public.status_historico
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "status_historico_update_policy" ON public.status_historico
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "status_historico_delete_policy" ON public.status_historico
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- =====================================================
-- 7. CRIAR POLÍTICAS RLS PARA EQUIPAMENTOS_TIPOS
-- =====================================================

CREATE POLICY "equipamentos_tipos_select_policy" ON public.equipamentos_tipos
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "equipamentos_tipos_insert_policy" ON public.equipamentos_tipos
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "equipamentos_tipos_update_policy" ON public.equipamentos_tipos
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "equipamentos_tipos_delete_policy" ON public.equipamentos_tipos
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- =====================================================
-- 8. VERIFICAR STATUS FINAL
-- =====================================================

-- Verificar se RLS está habilitado
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('ordens_servico', 'usuarios', 'clientes', 'empresas', 'status_historico', 'equipamentos_tipos')
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
    tablename,
    COUNT(*) as total_policies,
    string_agg(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('ordens_servico', 'usuarios', 'clientes', 'empresas', 'status_historico', 'equipamentos_tipos')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ RLS habilitado em todas as tabelas
-- ✅ Políticas adequadas para usuários autenticados
-- ✅ Segurança mantida
-- ✅ Funcionalidade restaurada
-- =====================================================

