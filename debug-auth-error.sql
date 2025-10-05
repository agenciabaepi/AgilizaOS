-- =====================================================
-- DEBUG AUTHORIZATION ERROR - DIAGNÓSTICO RLS
-- =====================================================
-- Este script ajuda a diagnosticar problemas de autorização
-- após as mudanças nas políticas RLS.

-- =====================================================
-- 1. VERIFICAR STATUS DAS POLÍTICAS RLS
-- =====================================================

-- Verificar quais tabelas têm RLS habilitado
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO'
        ELSE 'RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- =====================================================
-- 2. VERIFICAR POLÍTICAS EXISTENTES
-- =====================================================

-- Listar todas as políticas RLS ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    roles,
    qual as condition,
    with_check as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 3. VERIFICAR FUNÇÕES AUTH
-- =====================================================

-- Testar se auth.role() está funcionando
SELECT 
    'auth.role()' as function_name,
    auth.role() as current_role,
    CASE 
        WHEN auth.role() IS NULL THEN 'NULL - PROBLEMA!'
        WHEN auth.role() = 'authenticated' THEN 'OK - AUTENTICADO'
        WHEN auth.role() = 'anon' THEN 'ANÔNIMO'
        ELSE 'OUTRO: ' || auth.role()
    END as status;

-- Testar se auth.uid() está funcionando
SELECT 
    'auth.uid()' as function_name,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN 'NULL - USUÁRIO NÃO AUTENTICADO'
        ELSE 'OK - USUÁRIO: ' || auth.uid()
    END as status;

-- =====================================================
-- 4. VERIFICAR SESSÃO ATUAL
-- =====================================================

-- Informações sobre a sessão atual
SELECT 
    'current_user' as info,
    current_user as value
UNION ALL
SELECT 
    'session_user',
    session_user
UNION ALL
SELECT 
    'current_database',
    current_database()
UNION ALL
SELECT 
    'inet_client_addr',
    inet_client_addr()::text
UNION ALL
SELECT 
    'auth.role()',
    COALESCE(auth.role(), 'NULL')
UNION ALL
SELECT 
    'auth.uid()',
    COALESCE(auth.uid()::text, 'NULL');

-- =====================================================
-- 5. TESTAR ACESSO A TABELAS CRÍTICAS
-- =====================================================

-- Testar acesso a tabelas principais
DO $$
DECLARE
    table_name text;
    result_count integer;
    error_msg text;
BEGIN
    -- Lista de tabelas críticas para testar
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('empresas', 'usuarios', 'ordens_servico', 'vendas', 'clientes')
        ORDER BY tablename
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', table_name) INTO result_count;
            RAISE NOTICE '✅ %: % registros acessíveis', table_name, result_count;
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
            RAISE NOTICE '❌ %: ERRO - %', table_name, error_msg;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 6. VERIFICAR POLÍTICAS PROBLEMÁTICAS
-- =====================================================

-- Encontrar políticas que podem estar causando problemas
SELECT 
    'POLÍTICAS COM auth.role() DIRETO' as issue_type,
    tablename,
    policyname,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND qual LIKE '%auth.role()%'
AND qual NOT LIKE '%select auth.role()%'

UNION ALL

SELECT 
    'POLÍTICAS COM auth.uid() DIRETO' as issue_type,
    tablename,
    policyname,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND qual LIKE '%auth.uid()%'
AND qual NOT LIKE '%select auth.uid()%';

-- =====================================================
-- 7. SUGESTÕES DE CORREÇÃO
-- =====================================================

-- Verificar se há políticas muito restritivas
SELECT 
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policies,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ SEM POLÍTICAS - TABELA INACESSÍVEL'
        WHEN COUNT(*) = 1 AND string_agg(qual, '') LIKE '%auth.role() = ''authenticated''%' THEN '✅ POLÍTICA SIMPLES OK'
        WHEN COUNT(*) > 4 THEN '⚠️ MUITAS POLÍTICAS - PODE CAUSAR CONFLITOS'
        ELSE '⚠️ POLÍTICAS COMPLEXAS - VERIFICAR'
    END as recommendation
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;
