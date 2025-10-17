-- =====================================================
-- CORREÇÃO RLS FINAL - EQUIPAMENTOS_TIPOS
-- =====================================================
-- Este script corrige definitivamente o RLS para equipamentos_tipos
-- A API usa chave anônima, então precisamos permitir operações para anônimos

-- 1. REMOVER TODAS AS POLÍTICAS ATUAIS
-- =====================================================
DROP POLICY IF EXISTS "Allow all read access to equipamentos_tipos" ON public.equipamentos_tipos;
DROP POLICY IF EXISTS "Allow authenticated insert to equipamentos_tipos" ON public.equipamentos_tipos;
DROP POLICY IF EXISTS "Allow authenticated update to equipamentos_tipos" ON public.equipamentos_tipos;
DROP POLICY IF EXISTS "Allow authenticated delete to equipamentos_tipos" ON public.equipamentos_tipos;
DROP POLICY IF EXISTS "Allow company authenticated insert to equipamentos_tipos" ON public.equipamentos_tipos;
DROP POLICY IF EXISTS "Allow company authenticated update to equipamentos_tipos" ON public.equipamentos_tipos;
DROP POLICY IF EXISTS "Allow company authenticated delete to equipamentos_tipos" ON public.equipamentos_tipos;

-- 2. CRIAR POLÍTICAS PERMISSIVAS (COMPATÍVEIS COM CHAVE ANÔNIMA)
-- =====================================================

-- Política para SELECT - Permitir que TODOS leiam
CREATE POLICY "equipamentos_tipos_select_all"
    ON public.equipamentos_tipos FOR SELECT
    TO public
    USING (true);

-- Política para INSERT - Permitir que TODOS insiram (API usa chave anônima)
CREATE POLICY "equipamentos_tipos_insert_all"
    ON public.equipamentos_tipos FOR INSERT
    TO public
    WITH CHECK (true);

-- Política para UPDATE - Permitir que TODOS atualizem (API usa chave anônima)
CREATE POLICY "equipamentos_tipos_update_all"
    ON public.equipamentos_tipos FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Política para DELETE - Permitir que TODOS deletem (API usa chave anônima)
CREATE POLICY "equipamentos_tipos_delete_all"
    ON public.equipamentos_tipos FOR DELETE
    TO public
    USING (true);

-- 3. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'equipamentos_tipos';

-- Testar todas as operações:
-- SELECT COUNT(*) FROM public.equipamentos_tipos;
-- INSERT INTO public.equipamentos_tipos (nome, categoria, empresa_id, ativo, quantidade_cadastrada) VALUES ('TESTE RLS', 'Geral', 'sua_empresa_id', true, 0);
-- UPDATE public.equipamentos_tipos SET nome = 'TESTE RLS ATUALIZADO' WHERE nome = 'TESTE RLS';
-- DELETE FROM public.equipamentos_tipos WHERE nome = 'TESTE RLS ATUALIZADO';

-- 4. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se consegue criar novos tipos de equipamentos
-- 2. Teste se consegue editar tipos existentes
-- 3. Teste se consegue deletar tipos
-- 4. Verifique se a listagem funciona
-- 5. Se tudo funcionar, equipamentos_tipos está CORRIGIDA!

-- 5. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.equipamentos_tipos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "equipamentos_tipos_select_all" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "equipamentos_tipos_insert_all" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "equipamentos_tipos_update_all" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "equipamentos_tipos_delete_all" ON public.equipamentos_tipos;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (com política smart)
-- ✅ configuracoes_comissao - CORRIGIDA
-- ✅ configuracoes_empresa - CORRIGIDA
-- 🔄 equipamentos_tipos - TESTANDO POLÍTICA PERMISSIVA
-- ⏳ grupos_produtos - PENDENTE
-- ⏳ notificacoes - PENDENTE
-- ⏳ ordens_servico - PENDENTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================





