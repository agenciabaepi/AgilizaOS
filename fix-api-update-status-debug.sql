-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO API UPDATE-STATUS
-- =====================================================
-- A API está falhando em: "Erro ao buscar dados da OS"
-- Vamos diagnosticar e corrigir

-- =====================================================
-- 1. VERIFICAR SE A OS EXISTE
-- =====================================================

-- Verificar se a OS #124 existe
SELECT 
    id,
    numero_os,
    equipamento,
    empresa_id,
    status,
    status_tecnico
FROM public.ordens_servico 
WHERE numero_os = '124'
OR id = '124';

-- =====================================================
-- 2. TESTAR SELECT COM SERVICE ROLE
-- =====================================================

-- Teste 1: Como service_role
SET ROLE service_role;
SELECT 
    id,
    equipamento,
    empresa_id
FROM public.ordens_servico 
WHERE id = '124'
OR numero_os = '124';
RESET ROLE;

-- Teste 2: Como usuário autenticado
SELECT 
    id,
    equipamento,
    empresa_id
FROM public.ordens_servico 
WHERE id = '124'
OR numero_os = '124';

-- =====================================================
-- 3. VERIFICAR POLÍTICAS SELECT
-- =====================================================

-- Verificar políticas SELECT na tabela
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as condition,
    with_check as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'ordens_servico'
AND cmd = 'SELECT';

-- =====================================================
-- 4. VERIFICAR PERMISSÕES ESPECÍFICAS DA SERVICE ROLE
-- =====================================================

-- Verificar se service_role pode fazer SELECT
SELECT 
    r.rolname as role_name,
    t.table_name,
    c.privilege_type,
    c.is_grantable
FROM information_schema.role_table_grants c
JOIN pg_roles r ON r.rolname = c.grantee
JOIN information_schema.tables t ON t.table_name = c.table_name
WHERE c.table_name = 'ordens_servico'
AND c.grantee = 'service_role'
AND c.privilege_type = 'SELECT';

-- =====================================================
-- 5. TESTAR SELECT COM DIFERENTES IDS
-- =====================================================

-- Testar com diferentes formatos de ID
DO $$
DECLARE
    result_count integer;
    error_msg text;
    os_record record;
BEGIN
    BEGIN
        -- Tentar buscar por numero_os
        SELECT * INTO os_record
        FROM public.ordens_servico 
        WHERE numero_os = '124';
        
        IF FOUND THEN
            RAISE NOTICE '✅ OS encontrada por numero_os: %', os_record.id;
        ELSE
            RAISE NOTICE '❌ OS não encontrada por numero_os';
        END IF;
        
        -- Tentar buscar por id
        SELECT * INTO os_record
        FROM public.ordens_servico 
        WHERE id = '124';
        
        IF FOUND THEN
            RAISE NOTICE '✅ OS encontrada por id: %', os_record.numero_os;
        ELSE
            RAISE NOTICE '❌ OS não encontrada por id';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '❌ Erro no SELECT: %', error_msg;
    END;
END $$;

-- =====================================================
-- 6. VERIFICAR RLS E POLÍTICAS FINAIS
-- =====================================================

-- Status final do RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ATIVO'
        ELSE '❌ RLS DESABILITADO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename = 'ordens_servico';

-- =====================================================
-- STATUS DO DIAGNÓSTICO:
-- ✅ Verificação de existência da OS
-- ✅ Teste de SELECT com service_role
-- ✅ Teste de SELECT com usuário autenticado
-- ✅ Verificação de políticas SELECT
-- ✅ Verificação de permissões service_role
-- ✅ Teste com diferentes formatos de ID
-- ✅ Status final do RLS
-- =====================================================





