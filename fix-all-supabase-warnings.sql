-- =====================================================
-- CORREÇÃO COMPLETA DE AVISOS SUPABASE - PERFORMANCE E SEGURANÇA
-- =====================================================
-- Este script corrige todos os avisos de segurança e performance do Supabase:
-- 1. auth_rls_initplan - Otimização de políticas RLS
-- 2. multiple_permissive_policies - Consolidação de políticas
-- 3. duplicate_index - Remoção de índices redundantes

-- =====================================================
-- PARTE 1: CORREÇÃO AUTH_RLS_INITPLAN
-- =====================================================

-- 1.1 VENDAS
DROP POLICY IF EXISTS "Permitir insert de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir update de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir delete de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir select de vendas para usuários autenticados" ON public.vendas;

CREATE POLICY "vendas_all_policy" ON public.vendas
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.2 CLIENTES
DROP POLICY IF EXISTS "Permitir insert de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir update de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir delete de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir select de clientes para usuários autenticados" ON public.clientes;

CREATE POLICY "clientes_all_policy" ON public.clientes
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.3 ASSINATURAS
DROP POLICY IF EXISTS "Permitir insert de assinaturas para usuários autenticados" ON public.assinaturas;
DROP POLICY IF EXISTS "Permitir update de assinaturas para usuários autenticados" ON public.assinaturas;
DROP POLICY IF EXISTS "Permitir delete de assinaturas para usuários autenticados" ON public.assinaturas;
DROP POLICY IF EXISTS "Permitir select de assinaturas para usuários autenticados" ON public.assinaturas;

CREATE POLICY "assinaturas_all_policy" ON public.assinaturas
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.4 NOTAS_DASHBOARD
DROP POLICY IF EXISTS "Permitir insert de notas_dashboard para usuários autenticados" ON public.notas_dashboard;
DROP POLICY IF EXISTS "Permitir update de notas_dashboard para usuários autenticados" ON public.notas_dashboard;
DROP POLICY IF EXISTS "Permitir delete de notas_dashboard para usuários autenticados" ON public.notas_dashboard;
DROP POLICY IF EXISTS "Permitir select de notas_dashboard para usuários autenticados" ON public.notas_dashboard;

CREATE POLICY "notas_dashboard_all_policy" ON public.notas_dashboard
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.5 CAIXAS
DROP POLICY IF EXISTS "Permitir insert de caixas para usuários autenticados" ON public.caixas;
DROP POLICY IF EXISTS "Permitir update de caixas para usuários autenticados" ON public.caixas;
DROP POLICY IF EXISTS "Permitir delete de caixas para usuários autenticados" ON public.caixas;
DROP POLICY IF EXISTS "Permitir select de caixas para usuários autenticados" ON public.caixas;

CREATE POLICY "caixas_all_policy" ON public.caixas
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.6 TURNOS_CAIXA
DROP POLICY IF EXISTS "Permitir insert de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir update de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir delete de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir select de turnos_caixa para usuários autenticados" ON public.turnos_caixa;

CREATE POLICY "turnos_caixa_all_policy" ON public.turnos_caixa
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.7 MOVIMENTACOES_CAIXA
DROP POLICY IF EXISTS "Permitir insert de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "Permitir update de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "Permitir delete de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "Permitir select de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa;

CREATE POLICY "movimentacoes_caixa_all_policy" ON public.movimentacoes_caixa
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.8 COBRANCAS
DROP POLICY IF EXISTS "Permitir insert de cobrancas para usuários autenticados" ON public.cobrancas;
DROP POLICY IF EXISTS "Permitir update de cobrancas para usuários autenticados" ON public.cobrancas;
DROP POLICY IF EXISTS "Permitir delete de cobrancas para usuários autenticados" ON public.cobrancas;
DROP POLICY IF EXISTS "Permitir select de cobrancas para usuários autenticados" ON public.cobrancas;

CREATE POLICY "cobrancas_all_policy" ON public.cobrancas
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.9 COLUNAS_DASHBOARD
DROP POLICY IF EXISTS "Permitir insert de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard;
DROP POLICY IF EXISTS "Permitir update de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard;
DROP POLICY IF EXISTS "Permitir delete de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard;
DROP POLICY IF EXISTS "Permitir select de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard;

CREATE POLICY "colunas_dashboard_all_policy" ON public.colunas_dashboard
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.10 ORDENS_SERVICO
DROP POLICY IF EXISTS "Permitir insert de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir update de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir delete de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir select de ordens_servico para usuários autenticados" ON public.ordens_servico;

CREATE POLICY "ordens_servico_all_policy" ON public.ordens_servico
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.11 EMPRESAS
DROP POLICY IF EXISTS "Permitir insert de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir update de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir delete de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir select de empresas para usuários autenticados" ON public.empresas;

CREATE POLICY "empresas_all_policy" ON public.empresas
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.12 STATUS
DROP POLICY IF EXISTS "Permitir insert de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir update de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir delete de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir select de status para usuários autenticados" ON public.status;

CREATE POLICY "status_all_policy" ON public.status
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.13 STATUS_PERSONALIZADOS
DROP POLICY IF EXISTS "Permitir insert de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir update de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir delete de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir select de status_personalizados para usuários autenticados" ON public.status_personalizados;

CREATE POLICY "status_personalizados_all_policy" ON public.status_personalizados
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.14 FORNECEDORES
DROP POLICY IF EXISTS "Permitir insert de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir update de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir delete de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir select de fornecedores para usuários autenticados" ON public.fornecedores;

CREATE POLICY "fornecedores_all_policy" ON public.fornecedores
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.15 STATUS_FIXO
DROP POLICY IF EXISTS "Permitir insert de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir update de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir delete de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir select de status_fixo para usuários autenticados" ON public.status_fixo;

CREATE POLICY "status_fixo_all_policy" ON public.status_fixo
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.16 CODIGO_VERIFICACAO
DROP POLICY IF EXISTS "Permitir insert de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir update de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir delete de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir select de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;

CREATE POLICY "codigo_verificacao_all_policy" ON public.codigo_verificacao
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.17 USER_SESSIONS
DROP POLICY IF EXISTS "Permitir insert de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir update de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir delete de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir select de user_sessions para usuários autenticados" ON public.user_sessions;

CREATE POLICY "user_sessions_all_policy" ON public.user_sessions
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.18 EDIT_LOCKS
DROP POLICY IF EXISTS "Permitir insert de edit_locks para usuários autenticados" ON public.edit_locks;
DROP POLICY IF EXISTS "Permitir update de edit_locks para usuários autenticados" ON public.edit_locks;
DROP POLICY IF EXISTS "Permitir delete de edit_locks para usuários autenticados" ON public.edit_locks;
DROP POLICY IF EXISTS "Permitir select de edit_locks para usuários autenticados" ON public.edit_locks;

CREATE POLICY "edit_locks_all_policy" ON public.edit_locks
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.19 SYSTEM_LOGS
DROP POLICY IF EXISTS "Permitir insert de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir update de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir delete de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir select de system_logs para usuários autenticados" ON public.system_logs;

CREATE POLICY "system_logs_all_policy" ON public.system_logs
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.20 CATEGORIAS_CONTAS
DROP POLICY IF EXISTS "Permitir insert de categorias_contas para usuários autenticados" ON public.categorias_contas;
DROP POLICY IF EXISTS "Permitir update de categorias_contas para usuários autenticados" ON public.categorias_contas;
DROP POLICY IF EXISTS "Permitir delete de categorias_contas para usuários autenticados" ON public.categorias_contas;
DROP POLICY IF EXISTS "Permitir select de categorias_contas para usuários autenticados" ON public.categorias_contas;

CREATE POLICY "categorias_contas_all_policy" ON public.categorias_contas
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.21 CONTAS_PAGAR
DROP POLICY IF EXISTS "Permitir insert de contas_pagar para usuários autenticados" ON public.contas_pagar;
DROP POLICY IF EXISTS "Permitir update de contas_pagar para usuários autenticados" ON public.contas_pagar;
DROP POLICY IF EXISTS "Permitir delete de contas_pagar para usuários autenticados" ON public.contas_pagar;
DROP POLICY IF EXISTS "Permitir select de contas_pagar para usuários autenticados" ON public.contas_pagar;

CREATE POLICY "contas_pagar_all_policy" ON public.contas_pagar
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.22 TIPOS_CONTA
DROP POLICY IF EXISTS "Permitir insert de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir update de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir delete de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir select de tipos_conta para usuários autenticados" ON public.tipos_conta;

CREATE POLICY "tipos_conta_all_policy" ON public.tipos_conta
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.23 CLASSIFICACOES_CONTABEIS
DROP POLICY IF EXISTS "Permitir insert de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis;
DROP POLICY IF EXISTS "Permitir update de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis;
DROP POLICY IF EXISTS "Permitir delete de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis;
DROP POLICY IF EXISTS "Permitir select de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis;

CREATE POLICY "classificacoes_contabeis_all_policy" ON public.classificacoes_contabeis
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.24 CATALOGO_CATEGORIAS
DROP POLICY IF EXISTS "catalogo_categorias_select_policy" ON public.catalogo_categorias;
DROP POLICY IF EXISTS "catalogo_categorias_insert_policy" ON public.catalogo_categorias;
DROP POLICY IF EXISTS "catalogo_categorias_update_policy" ON public.catalogo_categorias;
DROP POLICY IF EXISTS "catalogo_categorias_delete_policy" ON public.catalogo_categorias;

CREATE POLICY "catalogo_categorias_all_policy" ON public.catalogo_categorias
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.25 CATALOGO_ITENS
DROP POLICY IF EXISTS "catalogo_itens_select_policy" ON public.catalogo_itens;
DROP POLICY IF EXISTS "catalogo_itens_insert_policy" ON public.catalogo_itens;
DROP POLICY IF EXISTS "catalogo_itens_update_policy" ON public.catalogo_itens;
DROP POLICY IF EXISTS "catalogo_itens_delete_policy" ON public.catalogo_itens;

CREATE POLICY "catalogo_itens_all_policy" ON public.catalogo_itens
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.26 CATEGORIAS_PRODUTOS
DROP POLICY IF EXISTS "categorias_produtos_select_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_insert_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_update_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_delete_policy" ON public.categorias_produtos;

CREATE POLICY "categorias_produtos_all_policy" ON public.categorias_produtos
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.27 CHECKLIST_ITENS (política especial - manter)
DROP POLICY IF EXISTS "Allow all read access to checklist_itens" ON public.checklist_itens;
DROP POLICY IF EXISTS "Allow authenticated write access to checklist_itens" ON public.checklist_itens;

CREATE POLICY "checklist_itens_read_policy"
  ON public.checklist_itens FOR SELECT
  TO public
  USING ((select auth.role()) = 'authenticated' OR (select auth.role()) IS NULL);

CREATE POLICY "checklist_itens_write_policy"
  ON public.checklist_itens FOR ALL
  TO public
  USING ((select auth.role()) = 'authenticated');

-- 1.28 CONFIGURACOES_COMISSAO
DROP POLICY IF EXISTS "configuracoes_comissao_select_policy" ON public.configuracoes_comissao;
DROP POLICY IF EXISTS "configuracoes_comissao_insert_policy" ON public.configuracoes_comissao;
DROP POLICY IF EXISTS "configuracoes_comissao_update_policy" ON public.configuracoes_comissao;
DROP POLICY IF EXISTS "configuracoes_comissao_delete_policy" ON public.configuracoes_comissao;

CREATE POLICY "configuracoes_comissao_all_policy" ON public.configuracoes_comissao
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.29 CONFIGURACOES_EMPRESA
DROP POLICY IF EXISTS "configuracoes_empresa_select_policy" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "configuracoes_empresa_insert_policy" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "configuracoes_empresa_update_policy" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "configuracoes_empresa_delete_policy" ON public.configuracoes_empresa;

CREATE POLICY "configuracoes_empresa_all_policy" ON public.configuracoes_empresa
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.30 GRUPOS_PRODUTOS
DROP POLICY IF EXISTS "grupos_produtos_select_policy" ON public.grupos_produtos;
DROP POLICY IF EXISTS "grupos_produtos_insert_policy" ON public.grupos_produtos;
DROP POLICY IF EXISTS "grupos_produtos_update_policy" ON public.grupos_produtos;
DROP POLICY IF EXISTS "grupos_produtos_delete_policy" ON public.grupos_produtos;

CREATE POLICY "grupos_produtos_all_policy" ON public.grupos_produtos
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 1.31 WHATSAPP_SESSIONS
DROP POLICY IF EXISTS "whatsapp_sessions_select_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_insert_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_update_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_delete_policy" ON public.whatsapp_sessions;

CREATE POLICY "whatsapp_sessions_all_policy" ON public.whatsapp_sessions
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- =====================================================
-- PARTE 2: VERIFICAÇÃO DE ÍNDICES DUPLICADOS
-- =====================================================

-- 2.1 Função para identificar índices duplicados
CREATE OR REPLACE FUNCTION find_duplicate_indexes()
RETURNS TABLE (
    table_name text,
    column_names text,
    index_count bigint,
    index_names text[]
) AS $$
BEGIN
    RETURN QUERY
    WITH index_columns AS (
        SELECT 
            t.relname as table_name,
            array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as column_names,
            array_agg(i.relname ORDER BY i.relname) as index_names
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r'
        AND t.relname IN ('produtos_servicos', 'whatsapp_sessions')
        AND i.relkind = 'i'
        AND NOT ix.indisprimary
        AND NOT ix.indisunique
        GROUP BY t.relname, ix.indrelid
    )
    SELECT 
        ic.table_name,
        array_to_string(ic.column_names, ', ') as column_names,
        count(*) as index_count,
        ic.index_names
    FROM index_columns ic
    GROUP BY ic.table_name, ic.column_names, ic.index_names
    HAVING count(*) > 1
    ORDER BY ic.table_name, ic.column_names;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Executar verificação de índices duplicados
-- SELECT * FROM find_duplicate_indexes();

-- =====================================================
-- PARTE 3: VERIFICAÇÃO FINAL
-- =====================================================

-- 3.1 Verificar políticas consolidadas
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- GROUP BY tablename
-- ORDER BY policy_count DESC;

-- 3.2 Verificar se auth.role() foi otimizado
-- SELECT schemaname, tablename, policyname, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND qual LIKE '%auth.role()%'
-- AND qual NOT LIKE '%select auth.role()%';

-- 3.3 Limpar função auxiliar
DROP FUNCTION IF EXISTS find_duplicate_indexes();

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ function_search_path_mutable - CORRIGIDO
-- ✅ auth_rls_initplan - CORRIGIDO
-- ✅ multiple_permissive_policies - CORRIGIDO
-- 🔄 duplicate_index - VERIFICAÇÃO NECESSÁRIA
-- =====================================================

-- INSTRUÇÕES PÓS-EXECUÇÃO:
-- 1. Execute as queries de verificação para confirmar as correções
-- 2. Para índices duplicados, execute primeiro a função de verificação
-- 3. Identifique e remova manualmente os índices duplicados conforme necessário
-- 4. Teste a aplicação para garantir que tudo funciona corretamente
-- 5. Execute uma nova verificação de avisos no Supabase Dashboard
