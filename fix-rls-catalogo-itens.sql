-- =====================================================
-- CORREÇÃO RLS GRADUAL - CATALOGO_ITENS
-- =====================================================
-- Este script habilita RLS apenas para a tabela catalogo_itens
-- para teste gradual sem quebrar o sistema

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'catalogo_itens';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.catalogo_itens ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Apenas usuários autenticados podem ver
CREATE POLICY "catalogo_itens_select_policy" ON public.catalogo_itens
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT - Apenas usuários autenticados podem inserir
CREATE POLICY "catalogo_itens_insert_policy" ON public.catalogo_itens
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE - Apenas usuários autenticados podem atualizar
CREATE POLICY "catalogo_itens_update_policy" ON public.catalogo_itens
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE - Apenas usuários autenticados podem deletar
CREATE POLICY "catalogo_itens_delete_policy" ON public.catalogo_itens
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'catalogo_itens';

-- Testar acesso (deve retornar dados se autenticado):
-- SELECT COUNT(*) FROM public.catalogo_itens;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue acessar os itens do catálogo
-- 3. Teste criar/editar itens do catálogo
-- 4. Teste a busca e filtros do catálogo
-- 5. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.catalogo_itens DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "catalogo_itens_select_policy" ON public.catalogo_itens;
-- DROP POLICY IF EXISTS "catalogo_itens_insert_policy" ON public.catalogo_itens;
-- DROP POLICY IF EXISTS "catalogo_itens_update_policy" ON public.catalogo_itens;
-- DROP POLICY IF EXISTS "catalogo_itens_delete_policy" ON public.catalogo_itens;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- 🔄 catalogo_itens - EM CORREÇÃO
-- ⏳ categorias_produtos - PRÓXIMA
-- ⏳ equipamentos_tipos - PRÓXIMA
-- ⏳ grupos_produtos - PRÓXIMA
-- ⏳ configuracaoes_comissao - PRÓXIMA
-- ⏳ configuracaoes_empresa - PRÓXIMA
-- ⏳ checklist_itens - PRÓXIMA
-- ⏳ notificacoes - PRÓXIMA
-- ⚠️ ordens_servico - CRÍTICA (deixar por último)
-- ⚠️ pagamentos - CRÍTICA (deixar por último)
-- =====================================================
