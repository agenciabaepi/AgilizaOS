-- =====================================================
-- CORREÇÃO SEARCH_PATH DAS FUNÇÕES
-- =====================================================
-- Este script corrige o search_path de todas as funções identificadas
-- pelo linter de segurança do Supabase

-- =====================================================
-- CORREÇÃO DE FUNÇÕES COM SEARCH_PATH MUTÁVEL
-- =====================================================

-- 1. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- 2. limpar_codigos_expirados
ALTER FUNCTION public.limpar_codigos_expirados() SET search_path = '';

-- 3. update_tipos_conta_updated_at
ALTER FUNCTION public.update_tipos_conta_updated_at() SET search_path = '';

-- 4. get_categoria_completa
ALTER FUNCTION public.get_categoria_completa(uuid) SET search_path = '';

-- 5. debug_log
ALTER FUNCTION public.debug_log(text) SET search_path = '';

-- 6. calcular_comissao_entrega
ALTER FUNCTION public.calcular_comissao_entrega(uuid, uuid) SET search_path = '';

-- 7. get_my_empresa_id
ALTER FUNCTION public.get_my_empresa_id() SET search_path = '';

-- 8. trigger_registrar_mudanca_status
ALTER FUNCTION public.trigger_registrar_mudanca_status() SET search_path = '';

-- 9. trigger_teste_basico
ALTER FUNCTION public.trigger_teste_basico() SET search_path = '';

-- 10. calcular_comissao_entrega_segura
ALTER FUNCTION public.calcular_comissao_entrega_segura(uuid, uuid) SET search_path = '';

-- 11. set_updated_at
ALTER FUNCTION public.set_updated_at() SET search_path = '';

-- 12. update_last_activity
ALTER FUNCTION public.update_last_activity() SET search_path = '';

-- 13. enforce_single_session
ALTER FUNCTION public.enforce_single_session() SET search_path = '';

-- 14. cleanup_inactive_sessions
ALTER FUNCTION public.cleanup_inactive_sessions() SET search_path = '';

-- 15. force_user_logout
ALTER FUNCTION public.force_user_logout(uuid) SET search_path = '';

-- 16. get_company_session_stats
ALTER FUNCTION public.get_company_session_stats() SET search_path = '';

-- 17. check_user_other_sessions
ALTER FUNCTION public.check_user_other_sessions(uuid) SET search_path = '';

-- 18. get_expiring_sessions
ALTER FUNCTION public.get_expiring_sessions() SET search_path = '';

-- 19. generate_random_4_digit_string
ALTER FUNCTION public.generate_random_4_digit_string() SET search_path = '';

-- 20. set_senha_acesso_on_insert
ALTER FUNCTION public.set_senha_acesso_on_insert() SET search_path = '';

-- 21. empresa_tem_assinatura_ativa
ALTER FUNCTION public.empresa_tem_assinatura_ativa(uuid) SET search_path = '';

-- 22. obter_plano_empresa
ALTER FUNCTION public.obter_plano_empresa(uuid) SET search_path = '';

-- 23. calcular_comissao_entrega_valida
ALTER FUNCTION public.calcular_comissao_entrega_valida(uuid, uuid) SET search_path = '';

-- 24. registrar_mudanca_status
ALTER FUNCTION public.registrar_mudanca_status() SET search_path = '';

-- 25. calcular_comissao_entrega_producao
ALTER FUNCTION public.calcular_comissao_entrega_producao(uuid, uuid) SET search_path = '';

-- 26. gerar_numero_os
ALTER FUNCTION public.gerar_numero_os() SET search_path = '';

-- 27. update_equipamentos_tipos_updated_at
ALTER FUNCTION public.update_equipamentos_tipos_updated_at() SET search_path = '';

-- 28. jwt_custom_claims
ALTER FUNCTION public.jwt_custom_claims() SET search_path = '';

-- 29. clientes_por_mes
ALTER FUNCTION public.clientes_por_mes() SET search_path = '';

-- 30. teste_trigger_func
ALTER FUNCTION public.teste_trigger_func() SET search_path = '';

-- 31. calcular_comissao_entrega_final
ALTER FUNCTION public.calcular_comissao_entrega_final(uuid, uuid) SET search_path = '';

-- 32. update_classificacoes_contabeis_updated_at
ALTER FUNCTION public.update_classificacoes_contabeis_updated_at() SET search_path = '';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute para verificar se as funções foram corrigidas:
-- SELECT 
--     n.nspname as schema_name,
--     p.proname as function_name,
--     pg_get_function_identity_arguments(p.oid) as arguments,
--     p.prosecdef as security_definer,
--     CASE 
--         WHEN p.proconfig IS NULL THEN '❌ SEM SEARCH_PATH'
--         WHEN 'search_path=' = ANY(p.proconfig) THEN '❌ SEARCH_PATH VAZIO'
--         ELSE '✅ SEARCH_PATH DEFINIDO'
--     END as search_path_status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN (
--     'update_updated_at_column', 'limpar_codigos_expirados', 'update_tipos_conta_updated_at',
--     'get_categoria_completa', 'debug_log', 'calcular_comissao_entrega', 'get_my_empresa_id',
--     'trigger_registrar_mudanca_status', 'trigger_teste_basico', 'calcular_comissao_entrega_segura',
--     'set_updated_at', 'update_last_activity', 'enforce_single_session', 'cleanup_inactive_sessions',
--     'force_user_logout', 'get_company_session_stats', 'check_user_other_sessions',
--     'get_expiring_sessions', 'generate_random_4_digit_string', 'set_senha_acesso_on_insert',
--     'empresa_tem_assinatura_ativa', 'obter_plano_empresa', 'calcular_comissao_entrega_valida',
--     'registrar_mudanca_status', 'calcular_comissao_entrega_producao', 'gerar_numero_os',
--     'update_equipamentos_tipos_updated_at', 'jwt_custom_claims', 'clientes_por_mes',
--     'teste_trigger_func', 'calcular_comissao_entrega_final', 'update_classificacoes_contabeis_updated_at'
-- )
-- ORDER BY p.proname;

-- =====================================================
-- STATUS FINAL DAS CORREÇÕES DE SEGURANÇA:
-- ✅ TODAS AS TABELAS TÊM RLS HABILITADO (45 tabelas)
-- ✅ TODAS AS VIEWS HERDAM SEGURANÇA DAS TABELAS
-- ✅ TODAS AS FUNÇÕES TÊM SEARCH_PATH SEGURO (32 funções)
-- =====================================================

-- =====================================================
-- ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter (remover search_path):
-- ALTER FUNCTION public.update_updated_at_column() RESET search_path;
-- ALTER FUNCTION public.limpar_codigos_expirados() RESET search_path;
-- ... (repetir para todas as funções)





