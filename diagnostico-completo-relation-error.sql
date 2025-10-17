-- =====================================================
-- DIAGNÓSTICO COMPLETO: ENCONTRAR TODAS AS CAUSAS DO ERRO
-- =====================================================

-- 1) Verificar se a tabela existe
SELECT 
    'Tabela ordens_servico existe?' AS pergunta,
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ordens_servico'
    ) AS resposta;

-- 2) Listar TODOS os triggers na tabela
SELECT 
    'TRIGGERS ATIVOS' AS tipo,
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'ordens_servico'
ORDER BY trigger_name;

-- 3) Listar TODAS as funções que podem estar sendo chamadas
SELECT 
    'FUNÇÕES ENCONTRADAS' AS tipo,
    proname AS function_name,
    prorettype::regtype AS return_type,
    proconfig AS config_options
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname LIKE '%ordens%' 
   OR proname LIKE '%senha%'
   OR proname LIKE '%numero%'
   OR proname LIKE '%trigger%'
ORDER BY proname;

-- 4) Verificar search_path atual
SELECT 
    'SEARCH_PATH ATUAL' AS tipo,
    current_setting('search_path') AS valor;

-- 5) Verificar permissões na tabela
SELECT 
    'PERMISSÕES' AS tipo,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'ordens_servico'
ORDER BY grantee, privilege_type;

-- 6) Tentar INSERT simples para ver onde falha exatamente
BEGIN;
SAVEPOINT test_diagnostico;

-- Buscar IDs válidos primeiro
SELECT 
    'IDS VÁLIDOS' AS tipo,
    (SELECT id FROM public.empresas LIMIT 1) AS empresa_id,
    (SELECT id FROM public.clientes LIMIT 1) AS cliente_id,
    (SELECT tecnico_id FROM public.usuarios WHERE tecnico_id IS NOT NULL LIMIT 1) AS tecnico_id;

ROLLBACK TO SAVEPOINT test_diagnostico;
COMMIT;





