-- =====================================================
-- DIAGNÓSTICO COMPLETO - PROBLEMA CRIAÇÃO DE OS
-- =====================================================
-- Este script faz um diagnóstico completo para identificar o problema

-- 1. VERIFICAR SE A FUNÇÃO EXISTE
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_random_4_digit_string') 
        THEN '✅ Função existe'
        ELSE '❌ Função NÃO existe'
    END as status_funcao;

-- 2. VERIFICAR RLS NA TABELA ORDENS_SERVICO
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'ordens_servico';

-- 3. VERIFICAR POLÍTICAS ATIVAS
SELECT 
    COUNT(*) as total_policies,
    string_agg(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'ordens_servico';

-- 4. VERIFICAR TRIGGERS ATIVOS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ordens_servico'
AND event_object_schema = 'public';

-- 5. VERIFICAR COLUNAS DA TABELA
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ordens_servico'
ORDER BY ordinal_position;

-- 6. TESTAR FUNÇÃO MANUALMENTE
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_random_4_digit_string') 
        THEN generate_random_4_digit_string()
        ELSE 'ERRO: Função não existe'
    END as teste_funcao;

-- 7. VERIFICAR PERMISSÕES DO USUÁRIO ATUAL
SELECT 
    current_user as usuario_atual,
    session_user as sessao_usuario,
    current_database() as database_atual;

-- 8. VERIFICAR SE CONSEGUE ACESSAR A TABELA
DO $$
DECLARE
    result_count integer;
    error_msg text;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO result_count FROM public.ordens_servico;
        RAISE NOTICE '✅ SELECT funcionando: % registros', result_count;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '❌ SELECT com erro: %', error_msg;
    END;
END $$;

