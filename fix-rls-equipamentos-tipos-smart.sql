-- =====================================================
-- CORREÇÃO RLS SMART - EQUIPAMENTOS_TIPOS
-- =====================================================
-- Este script habilita RLS com política inteligente para equipamentos_tipos
-- Permite leitura para todos (incluindo APIs com chave anônima)
-- Restringe escrita apenas para usuários autenticados

-- 1. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.equipamentos_tipos ENABLE ROW LEVEL SECURITY;

-- 2. CRIAR POLÍTICAS SMART
-- =====================================================

-- Política para SELECT - Permitir que TODOS (anônimos e autenticados) leiam tipos de equipamentos
-- Isso é necessário porque a API de leitura pode estar usando a chave anon
CREATE POLICY "Allow all read access to equipamentos_tipos"
    ON public.equipamentos_tipos FOR SELECT
    TO public -- Permite acesso para todos, incluindo anônimos
    USING (true);

-- Política para INSERT - Apenas usuários autenticados podem inserir
CREATE POLICY "Allow authenticated insert to equipamentos_tipos"
    ON public.equipamentos_tipos FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE - Apenas usuários autenticados podem atualizar
CREATE POLICY "Allow authenticated update to equipamentos_tipos"
    ON public.equipamentos_tipos FOR UPDATE
    TO authenticated
    USING (auth.role() = 'authenticated');

-- Política para DELETE - Apenas usuários autenticados podem deletar
CREATE POLICY "Allow authenticated delete to equipamentos_tipos"
    ON public.equipamentos_tipos FOR DELETE
    TO authenticated
    USING (auth.role() = 'authenticated');

-- 3. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'equipamentos_tipos';

-- Testar acesso de leitura (deve funcionar mesmo sem estar logado):
-- SELECT COUNT(*) FROM public.equipamentos_tipos;

-- Ver tipos de equipamentos disponíveis:
-- SELECT id, nome, descricao FROM public.equipamentos_tipos ORDER BY nome;

-- 4. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a listagem de equipamentos funciona
-- 2. Verifique se consegue criar/editar tipos de equipamentos
-- 3. Confirme que os dropdowns de tipos funcionam
-- 4. Teste se o cadastro de equipamentos ainda funciona
-- 5. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 5. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.equipamentos_tipos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all read access to equipamentos_tipos" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "Allow authenticated insert to equipamentos_tipos" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "Allow authenticated update to equipamentos_tipos" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "Allow authenticated delete to equipamentos_tipos" ON public.equipamentos_tipos;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (com política smart)
-- ✅ configuracoes_comissao - CORRIGIDA
-- ✅ configuracoes_empresa - CORRIGIDA
-- 🔄 equipamentos_tipos - TESTANDO POLÍTICA SMART
-- ⏳ grupos_produtos - PENDENTE
-- ⏳ notificacoes - PENDENTE
-- ⏳ ordens_servico - PENDENTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================

