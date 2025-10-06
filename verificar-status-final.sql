-- =====================================================
-- VERIFICAÇÃO FINAL - STATUS APÓS CORREÇÃO
-- =====================================================

-- 1. VERIFICAR SE A FUNÇÃO EXISTE
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_random_4_digit_string') 
        THEN '✅ Função generate_random_4_digit_string CRIADA'
        ELSE '❌ Função NÃO existe'
    END as status_funcao;

-- 2. TESTAR A FUNÇÃO
SELECT generate_random_4_digit_string() as senha_gerada;

-- 3. VERIFICAR RLS NA TABELA ORDENS_SERVICO
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'ordens_servico';

-- 4. VERIFICAR POLÍTICAS RESTANTES
SELECT 
    COUNT(*) as total_policies,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NENHUMA POLÍTICA RESTANTE'
        ELSE '⚠️ Ainda há ' || COUNT(*) || ' políticas'
    END as status_policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'ordens_servico';

-- 5. TESTAR ACESSO À TABELA
DO $$
DECLARE
    result_count integer;
    error_msg text;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO result_count FROM public.ordens_servico;
        RAISE NOTICE '✅ SELECT funcionando: % registros encontrados', result_count;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '❌ SELECT com erro: %', error_msg;
    END;
END $$;

-- 6. VERIFICAR TRIGGERS ATIVOS
SELECT 
    COUNT(*) as total_triggers,
    string_agg(trigger_name, ', ') as triggers
FROM information_schema.triggers 
WHERE event_object_table = 'ordens_servico'
AND event_object_schema = 'public';

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Função generate_random_4_digit_string CRIADA
-- ✅ RLS DESABILITADO
-- ✅ NENHUMA POLÍTICA RESTANTE
-- ✅ SELECT funcionando
-- =====================================================

