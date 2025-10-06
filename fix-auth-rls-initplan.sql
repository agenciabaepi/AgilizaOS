-- =====================================================
-- CORREÇÃO AUTH_RLS_INITPLAN - PERFORMANCE RLS
-- =====================================================
-- Este script corrige os avisos de segurança "auth_rls_initplan"
-- substituindo auth.<function>() por (select auth.<function>())
-- nas políticas RLS para melhorar a performance.

-- =====================================================
-- TABELAS COM POLÍTICAS AUTH_RLS_INITPLAN
-- =====================================================

-- 1. VENDAS
-- =====================================================
-- Remover políticas existentes
DROP POLICY IF EXISTS "Permitir insert de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir update de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir delete de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir select de vendas para usuários autenticados" ON public.vendas;

-- Recriar políticas otimizadas
CREATE POLICY "Permitir insert de vendas para usuários autenticados" ON public.vendas
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de vendas para usuários autenticados" ON public.vendas
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de vendas para usuários autenticados" ON public.vendas
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de vendas para usuários autenticados" ON public.vendas
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 2. CLIENTES
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir update de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir delete de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir select de clientes para usuários autenticados" ON public.clientes;

CREATE POLICY "Permitir insert de clientes para usuários autenticados" ON public.clientes
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de clientes para usuários autenticados" ON public.clientes
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de clientes para usuários autenticados" ON public.clientes
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de clientes para usuários autenticados" ON public.clientes
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 3. ASSINATURAS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de assinaturas para usuários autenticados" ON public.assinaturas;
DROP POLICY IF EXISTS "Permitir update de assinaturas para usuários autenticados" ON public.assinaturas;
DROP POLICY IF EXISTS "Permitir delete de assinaturas para usuários autenticados" ON public.assinaturas;
DROP POLICY IF EXISTS "Permitir select de assinaturas para usuários autenticados" ON public.assinaturas;

CREATE POLICY "Permitir insert de assinaturas para usuários autenticados" ON public.assinaturas
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de assinaturas para usuários autenticados" ON public.assinaturas
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de assinaturas para usuários autenticados" ON public.assinaturas
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de assinaturas para usuários autenticados" ON public.assinaturas
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 4. NOTAS_DASHBOARD
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de notas_dashboard para usuários autenticados" ON public.notas_dashboard;
DROP POLICY IF EXISTS "Permitir update de notas_dashboard para usuários autenticados" ON public.notas_dashboard;
DROP POLICY IF EXISTS "Permitir delete de notas_dashboard para usuários autenticados" ON public.notas_dashboard;
DROP POLICY IF EXISTS "Permitir select de notas_dashboard para usuários autenticados" ON public.notas_dashboard;

CREATE POLICY "Permitir insert de notas_dashboard para usuários autenticados" ON public.notas_dashboard
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de notas_dashboard para usuários autenticados" ON public.notas_dashboard
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de notas_dashboard para usuários autenticados" ON public.notas_dashboard
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de notas_dashboard para usuários autenticados" ON public.notas_dashboard
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 5. CAIXAS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de caixas para usuários autenticados" ON public.caixas;
DROP POLICY IF EXISTS "Permitir update de caixas para usuários autenticados" ON public.caixas;
DROP POLICY IF EXISTS "Permitir delete de caixas para usuários autenticados" ON public.caixas;
DROP POLICY IF EXISTS "Permitir select de caixas para usuários autenticados" ON public.caixas;

CREATE POLICY "Permitir insert de caixas para usuários autenticados" ON public.caixas
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de caixas para usuários autenticados" ON public.caixas
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de caixas para usuários autenticados" ON public.caixas
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de caixas para usuários autenticados" ON public.caixas
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 6. TURNOS_CAIXA
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir update de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir delete de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir select de turnos_caixa para usuários autenticados" ON public.turnos_caixa;

CREATE POLICY "Permitir insert de turnos_caixa para usuários autenticados" ON public.turnos_caixa
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de turnos_caixa para usuários autenticados" ON public.turnos_caixa
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de turnos_caixa para usuários autenticados" ON public.turnos_caixa
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de turnos_caixa para usuários autenticados" ON public.turnos_caixa
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 7. MOVIMENTACOES_CAIXA
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "Permitir update de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "Permitir delete de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "Permitir select de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa;

CREATE POLICY "Permitir insert de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de movimentacoes_caixa para usuários autenticados" ON public.movimentacoes_caixa
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 8. COBRANCAS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de cobrancas para usuários autenticados" ON public.cobrancas;
DROP POLICY IF EXISTS "Permitir update de cobrancas para usuários autenticados" ON public.cobrancas;
DROP POLICY IF EXISTS "Permitir delete de cobrancas para usuários autenticados" ON public.cobrancas;
DROP POLICY IF EXISTS "Permitir select de cobrancas para usuários autenticados" ON public.cobrancas;

CREATE POLICY "Permitir insert de cobrancas para usuários autenticados" ON public.cobrancas
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de cobrancas para usuários autenticados" ON public.cobrancas
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de cobrancas para usuários autenticados" ON public.cobrancas
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de cobrancas para usuários autenticados" ON public.cobrancas
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 9. COLUNAS_DASHBOARD
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard;
DROP POLICY IF EXISTS "Permitir update de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard;
DROP POLICY IF EXISTS "Permitir delete de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard;
DROP POLICY IF EXISTS "Permitir select de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard;

CREATE POLICY "Permitir insert de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de colunas_dashboard para usuários autenticados" ON public.colunas_dashboard
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 10. ORDENS_SERVICO
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir update de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir delete de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir select de ordens_servico para usuários autenticados" ON public.ordens_servico;

CREATE POLICY "Permitir insert de ordens_servico para usuários autenticados" ON public.ordens_servico
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de ordens_servico para usuários autenticados" ON public.ordens_servico
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de ordens_servico para usuários autenticados" ON public.ordens_servico
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de ordens_servico para usuários autenticados" ON public.ordens_servico
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 11. EMPRESAS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir update de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir delete de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir select de empresas para usuários autenticados" ON public.empresas;

CREATE POLICY "Permitir insert de empresas para usuários autenticados" ON public.empresas
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de empresas para usuários autenticados" ON public.empresas
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de empresas para usuários autenticados" ON public.empresas
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de empresas para usuários autenticados" ON public.empresas
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 12. STATUS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir update de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir delete de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir select de status para usuários autenticados" ON public.status;

CREATE POLICY "Permitir insert de status para usuários autenticados" ON public.status
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de status para usuários autenticados" ON public.status
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de status para usuários autenticados" ON public.status
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de status para usuários autenticados" ON public.status
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 13. STATUS_PERSONALIZADOS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir update de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir delete de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir select de status_personalizados para usuários autenticados" ON public.status_personalizados;

CREATE POLICY "Permitir insert de status_personalizados para usuários autenticados" ON public.status_personalizados
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de status_personalizados para usuários autenticados" ON public.status_personalizados
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de status_personalizados para usuários autenticados" ON public.status_personalizados
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de status_personalizados para usuários autenticados" ON public.status_personalizados
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 14. FORNECEDORES
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir update de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir delete de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir select de fornecedores para usuários autenticados" ON public.fornecedores;

CREATE POLICY "Permitir insert de fornecedores para usuários autenticados" ON public.fornecedores
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de fornecedores para usuários autenticados" ON public.fornecedores
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de fornecedores para usuários autenticados" ON public.fornecedores
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de fornecedores para usuários autenticados" ON public.fornecedores
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 15. STATUS_FIXO
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir update de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir delete de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir select de status_fixo para usuários autenticados" ON public.status_fixo;

CREATE POLICY "Permitir insert de status_fixo para usuários autenticados" ON public.status_fixo
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de status_fixo para usuários autenticados" ON public.status_fixo
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de status_fixo para usuários autenticados" ON public.status_fixo
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de status_fixo para usuários autenticados" ON public.status_fixo
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 16. CODIGO_VERIFICACAO
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir update de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir delete de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir select de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;

CREATE POLICY "Permitir insert de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 17. USER_SESSIONS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir update de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir delete de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir select de user_sessions para usuários autenticados" ON public.user_sessions;

CREATE POLICY "Permitir insert de user_sessions para usuários autenticados" ON public.user_sessions
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de user_sessions para usuários autenticados" ON public.user_sessions
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de user_sessions para usuários autenticados" ON public.user_sessions
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de user_sessions para usuários autenticados" ON public.user_sessions
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 18. EDIT_LOCKS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de edit_locks para usuários autenticados" ON public.edit_locks;
DROP POLICY IF EXISTS "Permitir update de edit_locks para usuários autenticados" ON public.edit_locks;
DROP POLICY IF EXISTS "Permitir delete de edit_locks para usuários autenticados" ON public.edit_locks;
DROP POLICY IF EXISTS "Permitir select de edit_locks para usuários autenticados" ON public.edit_locks;

CREATE POLICY "Permitir insert de edit_locks para usuários autenticados" ON public.edit_locks
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de edit_locks para usuários autenticados" ON public.edit_locks
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de edit_locks para usuários autenticados" ON public.edit_locks
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de edit_locks para usuários autenticados" ON public.edit_locks
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 19. SYSTEM_LOGS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir update de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir delete de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir select de system_logs para usuários autenticados" ON public.system_logs;

CREATE POLICY "Permitir insert de system_logs para usuários autenticados" ON public.system_logs
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de system_logs para usuários autenticados" ON public.system_logs
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de system_logs para usuários autenticados" ON public.system_logs
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de system_logs para usuários autenticados" ON public.system_logs
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 20. CATEGORIAS_CONTAS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de categorias_contas para usuários autenticados" ON public.categorias_contas;
DROP POLICY IF EXISTS "Permitir update de categorias_contas para usuários autenticados" ON public.categorias_contas;
DROP POLICY IF EXISTS "Permitir delete de categorias_contas para usuários autenticados" ON public.categorias_contas;
DROP POLICY IF EXISTS "Permitir select de categorias_contas para usuários autenticados" ON public.categorias_contas;

CREATE POLICY "Permitir insert de categorias_contas para usuários autenticados" ON public.categorias_contas
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de categorias_contas para usuários autenticados" ON public.categorias_contas
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de categorias_contas para usuários autenticados" ON public.categorias_contas
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de categorias_contas para usuários autenticados" ON public.categorias_contas
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 21. CONTAS_PAGAR
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de contas_pagar para usuários autenticados" ON public.contas_pagar;
DROP POLICY IF EXISTS "Permitir update de contas_pagar para usuários autenticados" ON public.contas_pagar;
DROP POLICY IF EXISTS "Permitir delete de contas_pagar para usuários autenticados" ON public.contas_pagar;
DROP POLICY IF EXISTS "Permitir select de contas_pagar para usuários autenticados" ON public.contas_pagar;

CREATE POLICY "Permitir insert de contas_pagar para usuários autenticados" ON public.contas_pagar
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de contas_pagar para usuários autenticados" ON public.contas_pagar
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de contas_pagar para usuários autenticados" ON public.contas_pagar
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de contas_pagar para usuários autenticados" ON public.contas_pagar
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 22. TIPOS_CONTA
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir update de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir delete de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir select de tipos_conta para usuários autenticados" ON public.tipos_conta;

CREATE POLICY "Permitir insert de tipos_conta para usuários autenticados" ON public.tipos_conta
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de tipos_conta para usuários autenticados" ON public.tipos_conta
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de tipos_conta para usuários autenticados" ON public.tipos_conta
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de tipos_conta para usuários autenticados" ON public.tipos_conta
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 23. CLASSIFICACOES_CONTABEIS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis;
DROP POLICY IF EXISTS "Permitir update de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis;
DROP POLICY IF EXISTS "Permitir delete de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis;
DROP POLICY IF EXISTS "Permitir select de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis;

CREATE POLICY "Permitir insert de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir update de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir delete de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis
    FOR DELETE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Permitir select de classificacoes_contabeis para usuários autenticados" ON public.classificacoes_contabeis
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- 24. CATALOGO_CATEGORIAS
-- =====================================================
DROP POLICY IF EXISTS "catalogo_categorias_select_policy" ON public.catalogo_categorias;
DROP POLICY IF EXISTS "catalogo_categorias_insert_policy" ON public.catalogo_categorias;
DROP POLICY IF EXISTS "catalogo_categorias_update_policy" ON public.catalogo_categorias;
DROP POLICY IF EXISTS "catalogo_categorias_delete_policy" ON public.catalogo_categorias;

CREATE POLICY "catalogo_categorias_select_policy" ON public.catalogo_categorias
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "catalogo_categorias_insert_policy" ON public.catalogo_categorias
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "catalogo_categorias_update_policy" ON public.catalogo_categorias
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "catalogo_categorias_delete_policy" ON public.catalogo_categorias
    FOR DELETE USING ((select auth.role()) = 'authenticated');

-- 25. CATALOGO_ITENS
-- =====================================================
DROP POLICY IF EXISTS "catalogo_itens_select_policy" ON public.catalogo_itens;
DROP POLICY IF EXISTS "catalogo_itens_insert_policy" ON public.catalogo_itens;
DROP POLICY IF EXISTS "catalogo_itens_update_policy" ON public.catalogo_itens;
DROP POLICY IF EXISTS "catalogo_itens_delete_policy" ON public.catalogo_itens;

CREATE POLICY "catalogo_itens_select_policy" ON public.catalogo_itens
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "catalogo_itens_insert_policy" ON public.catalogo_itens
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "catalogo_itens_update_policy" ON public.catalogo_itens
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "catalogo_itens_delete_policy" ON public.catalogo_itens
    FOR DELETE USING ((select auth.role()) = 'authenticated');

-- 26. CATEGORIAS_PRODUTOS
-- =====================================================
DROP POLICY IF EXISTS "categorias_produtos_select_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_insert_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_update_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_delete_policy" ON public.categorias_produtos;

CREATE POLICY "categorias_produtos_select_policy" ON public.categorias_produtos
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "categorias_produtos_insert_policy" ON public.categorias_produtos
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "categorias_produtos_update_policy" ON public.categorias_produtos
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "categorias_produtos_delete_policy" ON public.categorias_produtos
    FOR DELETE USING ((select auth.role()) = 'authenticated');

-- 27. CHECKLIST_ITENS
-- =====================================================
DROP POLICY IF EXISTS "Allow all read access to checklist_itens" ON public.checklist_itens;
DROP POLICY IF EXISTS "Allow authenticated write access to checklist_itens" ON public.checklist_itens;

CREATE POLICY "Allow all read access to checklist_itens"
  ON public.checklist_itens FOR SELECT
  TO public
  USING ((select auth.role()) = 'authenticated' OR (select auth.role()) IS NULL);

CREATE POLICY "Allow authenticated write access to checklist_itens"
  ON public.checklist_itens FOR ALL
  TO public
  USING ((select auth.role()) = 'authenticated');

-- 28. CONFIGURACOES_COMISSAO
-- =====================================================
DROP POLICY IF EXISTS "configuracoes_comissao_select_policy" ON public.configuracoes_comissao;
DROP POLICY IF EXISTS "configuracoes_comissao_insert_policy" ON public.configuracoes_comissao;
DROP POLICY IF EXISTS "configuracoes_comissao_update_policy" ON public.configuracoes_comissao;
DROP POLICY IF EXISTS "configuracoes_comissao_delete_policy" ON public.configuracoes_comissao;

CREATE POLICY "configuracoes_comissao_select_policy" ON public.configuracoes_comissao
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "configuracoes_comissao_insert_policy" ON public.configuracoes_comissao
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "configuracoes_comissao_update_policy" ON public.configuracoes_comissao
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "configuracoes_comissao_delete_policy" ON public.configuracoes_comissao
    FOR DELETE USING ((select auth.role()) = 'authenticated');

-- 29. CONFIGURACOES_EMPRESA
-- =====================================================
DROP POLICY IF EXISTS "configuracoes_empresa_select_policy" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "configuracoes_empresa_insert_policy" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "configuracoes_empresa_update_policy" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "configuracoes_empresa_delete_policy" ON public.configuracoes_empresa;

CREATE POLICY "configuracoes_empresa_select_policy" ON public.configuracoes_empresa
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "configuracoes_empresa_insert_policy" ON public.configuracoes_empresa
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "configuracoes_empresa_update_policy" ON public.configuracoes_empresa
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "configuracoes_empresa_delete_policy" ON public.configuracoes_empresa
    FOR DELETE USING ((select auth.role()) = 'authenticated');

-- 30. GRUPOS_PRODUTOS
-- =====================================================
DROP POLICY IF EXISTS "grupos_produtos_select_policy" ON public.grupos_produtos;
DROP POLICY IF EXISTS "grupos_produtos_insert_policy" ON public.grupos_produtos;
DROP POLICY IF EXISTS "grupos_produtos_update_policy" ON public.grupos_produtos;
DROP POLICY IF EXISTS "grupos_produtos_delete_policy" ON public.grupos_produtos;

CREATE POLICY "grupos_produtos_select_policy" ON public.grupos_produtos
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "grupos_produtos_insert_policy" ON public.grupos_produtos
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "grupos_produtos_update_policy" ON public.grupos_produtos
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "grupos_produtos_delete_policy" ON public.grupos_produtos
    FOR DELETE USING ((select auth.role()) = 'authenticated');

-- 31. ORDENS_SERVICO (segunda ocorrência - pode ter políticas duplicadas)
-- =====================================================
-- Verificar se existem políticas duplicadas e removê-las se necessário
-- As políticas já foram atualizadas acima

-- 32. WHATSAPP_SESSIONS
-- =====================================================
DROP POLICY IF EXISTS "whatsapp_sessions_select_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_insert_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_update_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_delete_policy" ON public.whatsapp_sessions;

CREATE POLICY "whatsapp_sessions_select_policy" ON public.whatsapp_sessions
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "whatsapp_sessions_insert_policy" ON public.whatsapp_sessions
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "whatsapp_sessions_update_policy" ON public.whatsapp_sessions
    FOR UPDATE USING ((select auth.role()) = 'authenticated');

CREATE POLICY "whatsapp_sessions_delete_policy" ON public.whatsapp_sessions
    FOR DELETE USING ((select auth.role()) = 'authenticated');

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute estas queries para verificar se as políticas foram aplicadas:

-- Verificar políticas existentes:
-- SELECT schemaname, tablename, policyname, cmd, roles, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- Verificar se auth.role() foi substituído por (select auth.role()):
-- SELECT schemaname, tablename, policyname, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND qual LIKE '%auth.role()%'
-- AND qual NOT LIKE '%select auth.role()%';

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ function_search_path_mutable - CORRIGIDO
-- 🔄 auth_rls_initplan - EM ANDAMENTO
-- ⏳ multiple_permissive_policies - PENDENTE
-- ⏳ duplicate_index - PENDENTE

