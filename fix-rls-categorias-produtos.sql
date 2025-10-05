-- =====================================================
-- CORREÇÃO RLS GRADUAL - CATEGORIAS_PRODUTOS
-- =====================================================
-- Este script habilita RLS apenas para a tabela categorias_produtos
-- para teste gradual sem quebrar o sistema

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'categorias_produtos';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.categorias_produtos ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Apenas usuários autenticados podem ver
CREATE POLICY "categorias_produtos_select_policy" ON public.categorias_produtos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT - Apenas usuários autenticados podem inserir
CREATE POLICY "categorias_produtos_insert_policy" ON public.categorias_produtos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE - Apenas usuários autenticados podem atualizar
CREATE POLICY "categorias_produtos_update_policy" ON public.categorias_produtos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE - Apenas usuários autenticados podem deletar
CREATE POLICY "categorias_produtos_delete_policy" ON public.categorias_produtos
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'categorias_produtos';

-- Testar acesso (deve retornar dados se autenticado):
-- SELECT COUNT(*) FROM public.categorias_produtos;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue acessar as categorias de produtos
-- 3. Teste criar/editar categorias de produtos
-- 4. Teste a listagem de produtos por categoria
-- 5. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.categorias_produtos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "categorias_produtos_select_policy" ON public.categorias_produtos;
-- DROP POLICY IF EXISTS "categorias_produtos_insert_policy" ON public.categorias_produtos;
-- DROP POLICY IF EXISTS "categorias_produtos_update_policy" ON public.categorias_produtos;
-- DROP POLICY IF EXISTS "categorias_produtos_delete_policy" ON public.categorias_produtos;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- 🔄 categorias_produtos - EM CORREÇÃO
-- ⏳ equipamentos_tipos - PRÓXIMA
-- ⏳ grupos_produtos - PRÓXIMA
-- ⏳ configuracaoes_comissao - PRÓXIMA
-- ⏳ configuracaoes_empresa - PRÓXIMA
-- ⏳ checklist_itens - PRÓXIMA
-- ⏳ notificacoes - PRÓXIMA
-- ⚠️ ordens_servico - CRÍTICA (deixar por último)
-- ⚠️ pagamentos - CRÍTICA (deixar por último)
-- =====================================================
