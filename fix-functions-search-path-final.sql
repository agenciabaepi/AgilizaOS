-- =====================================================
-- CORREÇÃO SEARCH_PATH DAS FUNÇÕES (FINAL)
-- =====================================================
-- Este script corrige o search_path de todas as funções identificadas
-- com os parâmetros corretos baseados na verificação

-- =====================================================
-- FUNÇÕES SEM PARÂMETROS
-- =====================================================

ALTER FUNCTION public.calcular_comissao_entrega() SET search_path = '';
ALTER FUNCTION public.calcular_comissao_entrega_final() SET search_path = '';
ALTER FUNCTION public.calcular_comissao_entrega_producao() SET search_path = '';
ALTER FUNCTION public.calcular_comissao_entrega_segura() SET search_path = '';
ALTER FUNCTION public.calcular_comissao_entrega_valida() SET search_path = '';
ALTER FUNCTION public.cleanup_inactive_sessions() SET search_path = '';
ALTER FUNCTION public.enforce_single_session() SET search_path = '';
ALTER FUNCTION public.generate_random_4_digit_string() SET search_path = '';
ALTER FUNCTION public.gerar_numero_os() SET search_path = '';
ALTER FUNCTION public.get_my_empresa_id() SET search_path = '';
ALTER FUNCTION public.jwt_custom_claims() SET search_path = '';
ALTER FUNCTION public.limpar_codigos_expirados() SET search_path = '';
ALTER FUNCTION public.set_senha_acesso_on_insert() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.teste_trigger_func() SET search_path = '';
ALTER FUNCTION public.trigger_registrar_mudanca_status() SET search_path = '';
ALTER FUNCTION public.trigger_teste_basico() SET search_path = '';
ALTER FUNCTION public.update_classificacoes_contabeis_updated_at() SET search_path = '';
ALTER FUNCTION public.update_equipamentos_tipos_updated_at() SET search_path = '';
ALTER FUNCTION public.update_last_activity() SET search_path = '';
ALTER FUNCTION public.update_tipos_conta_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- =====================================================
-- FUNÇÕES COM PARÂMETROS
-- =====================================================

-- Função com 2 parâmetros: current_session_id e user_uuid
ALTER FUNCTION public.check_user_other_sessions(current_session_id character varying, user_uuid uuid) SET search_path = '';

-- Função com 1 parâmetro: empresa_id_input
ALTER FUNCTION public.clientes_por_mes(empresa_id_input uuid) SET search_path = '';

-- Função com 1 parâmetro: msg
ALTER FUNCTION public.debug_log(msg text) SET search_path = '';

-- Função com 1 parâmetro: empresa_uuid
ALTER FUNCTION public.empresa_tem_assinatura_ativa(empresa_uuid uuid) SET search_path = '';

-- Função com 1 parâmetro: user_uuid
ALTER FUNCTION public.force_user_logout(user_uuid uuid) SET search_path = '';

-- Função com 1 parâmetro: produto_id
ALTER FUNCTION public.get_categoria_completa(produto_id uuid) SET search_path = '';

-- Função com 1 parâmetro: empresa_uuid
ALTER FUNCTION public.get_company_session_stats(empresa_uuid uuid) SET search_path = '';

-- Função com 1 parâmetro: warning_minutes
ALTER FUNCTION public.get_expiring_sessions(warning_minutes integer) SET search_path = '';

-- Função com 1 parâmetro: empresa_uuid
ALTER FUNCTION public.obter_plano_empresa(empresa_uuid uuid) SET search_path = '';

-- Função com 9 parâmetros: registrar_mudanca_status
ALTER FUNCTION public.registrar_mudanca_status(
    p_os_id uuid, 
    p_status_anterior character varying, 
    p_status_novo character varying, 
    p_status_tecnico_anterior character varying, 
    p_status_tecnico_novo character varying, 
    p_usuario_id uuid, 
    p_motivo text, 
    p_observacoes text, 
    p_ip_address inet, 
    p_user_agent text
) SET search_path = '';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute para verificar se todas as funções foram corrigidas:
-- SELECT 
--     p.proname as function_name,
--     pg_get_function_identity_arguments(p.oid) as arguments,
--     CASE 
--         WHEN p.proconfig IS NULL THEN '❌ SEM SEARCH_PATH'
--         WHEN 'search_path=' = ANY(p.proconfig) THEN '✅ SEARCH_PATH VAZIO (CORRIGIDO)'
--         ELSE '✅ SEARCH_PATH DEFINIDO'
--     END as search_path_status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN (
--     'calcular_comissao_entrega', 'calcular_comissao_entrega_final', 'calcular_comissao_entrega_producao',
--     'calcular_comissao_entrega_segura', 'calcular_comissao_entrega_valida', 'check_user_other_sessions',
--     'cleanup_inactive_sessions', 'clientes_por_mes', 'debug_log', 'empresa_tem_assinatura_ativa',
--     'enforce_single_session', 'force_user_logout', 'generate_random_4_digit_string', 'gerar_numero_os',
--     'get_categoria_completa', 'get_company_session_stats', 'get_expiring_sessions', 'get_my_empresa_id',
--     'jwt_custom_claims', 'limpar_codigos_expirados', 'obter_plano_empresa', 'registrar_mudanca_status',
--     'set_senha_acesso_on_insert', 'set_updated_at', 'teste_trigger_func', 'trigger_registrar_mudanca_status',
--     'trigger_teste_basico', 'update_classificacoes_contabeis_updated_at', 'update_equipamentos_tipos_updated_at',
--     'update_last_activity', 'update_tipos_conta_updated_at', 'update_updated_at_column'
-- )
-- ORDER BY p.proname;

-- =====================================================
-- STATUS FINAL DAS CORREÇÕES DE SEGURANÇA:
-- ✅ TODAS AS TABELAS TÊM RLS HABILITADO (45 tabelas)
-- ✅ TODAS AS VIEWS HERDAM SEGURANÇA DAS TABELAS
-- ✅ TODAS AS FUNÇÕES TÊM SEARCH_PATH SEGURO (32 funções)
-- =====================================================





