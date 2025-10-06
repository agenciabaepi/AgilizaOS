-- =====================================================
-- VERIFICAR FUNÇÕES EXISTENTES
-- =====================================================

-- 1. LISTAR TODAS AS FUNÇÕES PÚBLICAS
-- =====================================================
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE 
        WHEN p.proconfig IS NULL THEN '❌ SEM SEARCH_PATH'
        WHEN 'search_path=' = ANY(p.proconfig) THEN '❌ SEARCH_PATH VAZIO'
        ELSE '✅ SEARCH_PATH DEFINIDO'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 2. VERIFICAR FUNÇÕES ESPECÍFICAS MENCIONADAS NO LINTER
-- =====================================================
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN '❌ SEM SEARCH_PATH'
        WHEN 'search_path=' = ANY(p.proconfig) THEN '❌ SEARCH_PATH VAZIO'
        ELSE '✅ SEARCH_PATH DEFINIDO'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'update_updated_at_column', 'limpar_codigos_expirados', 'update_tipos_conta_updated_at',
    'get_categoria_completa', 'debug_log', 'calcular_comissao_entrega', 'get_my_empresa_id',
    'trigger_registrar_mudanca_status', 'trigger_teste_basico', 'calcular_comissao_entrega_segura',
    'set_updated_at', 'update_last_activity', 'enforce_single_session', 'cleanup_inactive_sessions',
    'force_user_logout', 'get_company_session_stats', 'check_user_other_sessions',
    'get_expiring_sessions', 'generate_random_4_digit_string', 'set_senha_acesso_on_insert',
    'empresa_tem_assinatura_ativa', 'obter_plano_empresa', 'calcular_comissao_entrega_valida',
    'registrar_mudanca_status', 'calcular_comissao_entrega_producao', 'gerar_numero_os',
    'update_equipamentos_tipos_updated_at', 'jwt_custom_claims', 'clientes_por_mes',
    'teste_trigger_func', 'calcular_comissao_entrega_final', 'update_classificacoes_contabeis_updated_at'
)
ORDER BY p.proname;

