-- =====================================================
-- CORREÇÃO RLS GRADUAL - GRUPOS_PRODUTOS
-- =====================================================
-- Este script habilita RLS apenas para a tabela grupos_produtos
-- A API usa serviceRoleKey, então pode usar políticas normais

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'grupos_produtos';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.grupos_produtos ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Usuários autenticados podem ver grupos da sua empresa
CREATE POLICY "grupos_produtos_select_policy" ON public.grupos_produtos
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT - Usuários autenticados podem criar grupos para sua empresa
CREATE POLICY "grupos_produtos_insert_policy" ON public.grupos_produtos
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE - Usuários autenticados podem atualizar grupos da sua empresa
CREATE POLICY "grupos_produtos_update_policy" ON public.grupos_produtos
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE - Usuários autenticados podem deletar grupos da sua empresa
CREATE POLICY "grupos_produtos_delete_policy" ON public.grupos_produtos
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- 4. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'grupos_produtos';

-- Testar acesso (deve retornar apenas grupos da empresa do usuário logado):
-- SELECT COUNT(*) FROM public.grupos_produtos;

-- Ver grupos disponíveis:
-- SELECT id, nome, descricao FROM public.grupos_produtos ORDER BY nome;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue acessar os grupos de produtos
-- 3. Teste criar/editar grupos de produtos
-- 4. Verifique se não consegue ver grupos de outras empresas
-- 5. Teste se o cadastro de produtos ainda funciona
-- 6. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.grupos_produtos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "grupos_produtos_select_policy" ON public.grupos_produtos;
-- DROP POLICY IF EXISTS "grupos_produtos_insert_policy" ON public.grupos_produtos;
-- DROP POLICY IF EXISTS "grupos_produtos_update_policy" ON public.grupos_produtos;
-- DROP POLICY IF EXISTS "grupos_produtos_delete_policy" ON public.grupos_produtos;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (com política smart)
-- ✅ configuracoes_comissao - CORRIGIDA
-- ✅ configuracoes_empresa - CORRIGIDA
-- ✅ equipamentos_tipos - CORRIGIDA (com política permissiva)
-- 🔄 grupos_produtos - EM TESTE
-- ⏳ notificacoes - PENDENTE
-- ⏳ ordens_servico - PENDENTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================

