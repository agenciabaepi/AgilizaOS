-- =====================================================
-- DIAGNÓSTICO: TRIGGERS E SEARCH_PATH
-- =====================================================

-- 1) Verificar se a tabela realmente existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ordens_servico'
) AS tabela_existe;

-- 2) Listar TODOS os triggers na tabela ordens_servico
SELECT 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'ordens_servico'
ORDER BY trigger_name;

-- 3) Verificar funções de trigger e search_path
SELECT
    proname AS function_name,
    proowner::regrole AS owner,
    proconfig AS config_options,
    pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname IN (
    'generate_random_4_digit_string',
    'set_senha_acesso_on_insert',
    'update_updated_at_column',
    'trigger_registrar_mudanca_status'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4) Verificar search_path dos roles
SELECT rolname, rolconfig 
FROM pg_roles 
WHERE rolname IN ('authenticated', 'service_role', 'postgres');

-- 5) Verificar search_path atual da sessão
SELECT current_setting('search_path') AS current_search_path;

-- 6) Testar INSERT simples para ver onde falha
BEGIN;
SAVEPOINT test_insert;

-- Tentar inserir um registro de teste
INSERT INTO public.ordens_servico (
    empresa_id, 
    cliente_id, 
    tecnico_id, 
    status, 
    equipamento,
    numero_os
) VALUES (
    (SELECT id FROM public.empresas LIMIT 1),
    (SELECT id FROM public.clientes LIMIT 1),
    (SELECT tecnico_id FROM public.usuarios WHERE tecnico_id IS NOT NULL LIMIT 1),
    'TESTE',
    'TESTE',
    9999
);

-- Se chegou até aqui, o INSERT funcionou
ROLLBACK TO SAVEPOINT test_insert;
COMMIT;

SELECT 'INSERT funcionou - problema está nos triggers' AS resultado;

