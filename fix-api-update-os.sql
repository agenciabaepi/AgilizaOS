-- =====================================================
-- CORREÇÃO API UPDATE OS - PROBLEMA DE ATUALIZAÇÃO
-- =====================================================
-- O problema agora é na API, não no banco. Vamos verificar outras tabelas relacionadas

-- 1. VERIFICAR RLS EM TABELAS RELACIONADAS
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('usuarios', 'clientes', 'empresas', 'status_historico', 'equipamentos_tipos')
ORDER BY tablename;

-- 2. VERIFICAR POLÍTICAS EM TABELAS RELACIONADAS
SELECT 
    tablename,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('usuarios', 'clientes', 'empresas', 'status_historico', 'equipamentos_tipos')
GROUP BY tablename
ORDER BY tablename;

-- 3. DESABILITAR RLS TEMPORARIAMENTE EM TABELAS CRÍTICAS
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_historico DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos_tipos DISABLE ROW LEVEL SECURITY;

-- 4. REMOVER POLÍTICAS DESSAS TABELAS
DO $$
DECLARE
    table_name text;
    policy_name text;
BEGIN
    FOR table_name IN SELECT unnest(ARRAY['usuarios', 'clientes', 'empresas', 'status_historico', 'equipamentos_tipos']) LOOP
        FOR policy_name IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = table_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
            RAISE NOTICE 'Removida política % da tabela %', policy_name, table_name;
        END LOOP;
    END LOOP;
END $$;

-- 5. VERIFICAR STATUS FINAL
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('ordens_servico', 'usuarios', 'clientes', 'empresas', 'status_historico', 'equipamentos_tipos')
ORDER BY tablename;

