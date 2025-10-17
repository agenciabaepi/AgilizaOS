-- =====================================================
-- CORREÇÃO MULTIPLE_PERMISSIVE_POLICIES - CONSOLIDAÇÃO RLS
-- =====================================================
-- Este script corrige os avisos de segurança "multiple_permissive_policies"
-- consolidando políticas RLS redundantes para melhorar a performance.

-- =====================================================
-- TABELAS COM MÚLTIPLAS POLÍTICAS PERMISSIVAS
-- =====================================================

-- 1. CATEGORIAS_PRODUTOS
-- =====================================================
-- Remover políticas redundantes e manter apenas uma por operação
DROP POLICY IF EXISTS "categorias_produtos_select_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_insert_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_update_policy" ON public.categorias_produtos;
DROP POLICY IF EXISTS "categorias_produtos_delete_policy" ON public.categorias_produtos;

-- Criar políticas consolidadas
CREATE POLICY "categorias_produtos_all_policy" ON public.categorias_produtos
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 2. CLIENTES
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir update de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir delete de clientes para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir select de clientes para usuários autenticados" ON public.clientes;

CREATE POLICY "clientes_all_policy" ON public.clientes
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 3. CODIGO_VERIFICACAO
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir update de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir delete de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;
DROP POLICY IF EXISTS "Permitir select de codigo_verificacao para usuários autenticados" ON public.codigo_verificacao;

CREATE POLICY "codigo_verificacao_all_policy" ON public.codigo_verificacao
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 4. COMISSOES_HISTORICO
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de comissoes_historico para usuários autenticados" ON public.comissoes_historico;
DROP POLICY IF EXISTS "Permitir update de comissoes_historico para usuários autenticados" ON public.comissoes_historico;
DROP POLICY IF EXISTS "Permitir delete de comissoes_historico para usuários autenticados" ON public.comissoes_historico;
DROP POLICY IF EXISTS "Permitir select de comissoes_historico para usuários autenticados" ON public.comissoes_historico;

CREATE POLICY "comissoes_historico_all_policy" ON public.comissoes_historico
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 5. EMPRESAS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir update de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir delete de empresas para usuários autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir select de empresas para usuários autenticados" ON public.empresas;

CREATE POLICY "empresas_all_policy" ON public.empresas
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 6. FORNECEDORES
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir update de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir delete de fornecedores para usuários autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir select de fornecedores para usuários autenticados" ON public.fornecedores;

CREATE POLICY "fornecedores_all_policy" ON public.fornecedores
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 7. ORDENS_SERVICO
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir update de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir delete de ordens_servico para usuários autenticados" ON public.ordens_servico;
DROP POLICY IF EXISTS "Permitir select de ordens_servico para usuários autenticados" ON public.ordens_servico;

CREATE POLICY "ordens_servico_all_policy" ON public.ordens_servico
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 8. PRODUTOS_SERVICOS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de produtos_servicos para usuários autenticados" ON public.produtos_servicos;
DROP POLICY IF EXISTS "Permitir update de produtos_servicos para usuários autenticados" ON public.produtos_servicos;
DROP POLICY IF EXISTS "Permitir delete de produtos_servicos para usuários autenticados" ON public.produtos_servicos;
DROP POLICY IF EXISTS "Permitir select de produtos_servicos para usuários autenticados" ON public.produtos_servicos;

CREATE POLICY "produtos_servicos_all_policy" ON public.produtos_servicos
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 9. STATUS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir update de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir delete de status para usuários autenticados" ON public.status;
DROP POLICY IF EXISTS "Permitir select de status para usuários autenticados" ON public.status;

CREATE POLICY "status_all_policy" ON public.status
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 10. STATUS_FIXO
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir update de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir delete de status_fixo para usuários autenticados" ON public.status_fixo;
DROP POLICY IF EXISTS "Permitir select de status_fixo para usuários autenticados" ON public.status_fixo;

CREATE POLICY "status_fixo_all_policy" ON public.status_fixo
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 11. STATUS_PERSONALIZADOS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir update de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir delete de status_personalizados para usuários autenticados" ON public.status_personalizados;
DROP POLICY IF EXISTS "Permitir select de status_personalizados para usuários autenticados" ON public.status_personalizados;

CREATE POLICY "status_personalizados_all_policy" ON public.status_personalizados
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 12. SUBCATEGORIAS_PRODUTOS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de subcategorias_produtos para usuários autenticados" ON public.subcategorias_produtos;
DROP POLICY IF EXISTS "Permitir update de subcategorias_produtos para usuários autenticados" ON public.subcategorias_produtos;
DROP POLICY IF EXISTS "Permitir delete de subcategorias_produtos para usuários autenticados" ON public.subcategorias_produtos;
DROP POLICY IF EXISTS "Permitir select de subcategorias_produtos para usuários autenticados" ON public.subcategorias_produtos;

CREATE POLICY "subcategorias_produtos_all_policy" ON public.subcategorias_produtos
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 13. SYSTEM_LOGS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir update de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir delete de system_logs para usuários autenticados" ON public.system_logs;
DROP POLICY IF EXISTS "Permitir select de system_logs para usuários autenticados" ON public.system_logs;

CREATE POLICY "system_logs_all_policy" ON public.system_logs
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 14. TERMOS_GARANTIA
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir update de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir delete de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir select de termos_garantia para usuários autenticados" ON public.termos_garantia;

CREATE POLICY "termos_garantia_all_policy" ON public.termos_garantia
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 15. TIPOS_CONTA
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir update de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir delete de tipos_conta para usuários autenticados" ON public.tipos_conta;
DROP POLICY IF EXISTS "Permitir select de tipos_conta para usuários autenticados" ON public.tipos_conta;

CREATE POLICY "tipos_conta_all_policy" ON public.tipos_conta
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 16. TURNOS_CAIXA
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir update de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir delete de turnos_caixa para usuários autenticados" ON public.turnos_caixa;
DROP POLICY IF EXISTS "Permitir select de turnos_caixa para usuários autenticados" ON public.turnos_caixa;

CREATE POLICY "turnos_caixa_all_policy" ON public.turnos_caixa
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 17. USER_SESSIONS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir update de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir delete de user_sessions para usuários autenticados" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir select de user_sessions para usuários autenticados" ON public.user_sessions;

CREATE POLICY "user_sessions_all_policy" ON public.user_sessions
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 18. USUARIOS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de usuarios para usuários autenticados" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir update de usuarios para usuários autenticados" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir delete de usuarios para usuários autenticados" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir select de usuarios para usuários autenticados" ON public.usuarios;

CREATE POLICY "usuarios_all_policy" ON public.usuarios
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- 19. VENDAS
-- =====================================================
DROP POLICY IF EXISTS "Permitir insert de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir update de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir delete de vendas para usuários autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir select de vendas para usuários autenticados" ON public.vendas;

CREATE POLICY "vendas_all_policy" ON public.vendas
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- =====================================================
-- TABELAS COM POLÍTICAS ESPECIAIS (MANTER SEPARADAS)
-- =====================================================
-- Algumas tabelas precisam manter políticas específicas por operação
-- devido a lógicas de negócio específicas

-- ASSINATURAS - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- CAIXAS - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- COBRANCAS - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- COLUNAS_DASHBOARD - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- MOVIMENTACOES_CAIXA - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- NOTAS_DASHBOARD - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- CATALOGO_CATEGORIAS - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- CATALOGO_ITENS - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- CHECKLIST_ITENS - manter políticas especiais
-- (já otimizadas no script anterior)

-- CONFIGURACOES_COMISSAO - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- CONFIGURACOES_EMPRESA - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- GRUPOS_PRODUTOS - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- WHATSAPP_SESSIONS - manter políticas separadas por operação
-- (já otimizadas no script anterior)

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute estas queries para verificar se as políticas foram consolidadas:

-- Verificar políticas existentes por tabela:
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- GROUP BY tablename
-- ORDER BY policy_count DESC;

-- Verificar se ainda existem múltiplas políticas permissivas:
-- SELECT tablename, policyname, cmd
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('categorias_produtos', 'clientes', 'codigo_verificacao', 'comissoes_historico', 'empresas', 'fornecedores', 'ordens_servico', 'produtos_servicos', 'status', 'status_fixo', 'status_personalizados', 'subcategorias_produtos', 'system_logs', 'termos_garantia', 'tipos_conta', 'turnos_caixa', 'user_sessions', 'usuarios', 'vendas')
-- ORDER BY tablename, cmd;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ function_search_path_mutable - CORRIGIDO
-- ✅ auth_rls_initplan - CORRIGIDO
-- 🔄 multiple_permissive_policies - EM ANDAMENTO
-- ⏳ duplicate_index - PENDENTE





