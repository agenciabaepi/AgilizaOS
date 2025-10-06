-- =====================================================
-- CORREÇÃO RLS GRADUAL - CONFIGURACOES_COMISSAO
-- =====================================================
-- Este script habilita RLS apenas para a tabela configuracoes_comissao
-- para teste gradual sem quebrar o sistema

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'configuracoes_comissao';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.configuracoes_comissao ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Apenas usuários autenticados podem ver
CREATE POLICY "configuracoes_comissao_select_policy" ON public.configuracoes_comissao
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT - Apenas usuários autenticados podem inserir
CREATE POLICY "configuracoes_comissao_insert_policy" ON public.configuracoes_comissao
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE - Apenas usuários autenticados podem atualizar
CREATE POLICY "configuracoes_comissao_update_policy" ON public.configuracoes_comissao
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE - Apenas usuários autenticados podem deletar
CREATE POLICY "configuracoes_comissao_delete_policy" ON public.configuracoes_comissao
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'configuracoes_comissao';

-- Testar acesso (deve retornar dados se autenticado):
-- SELECT COUNT(*) FROM public.configuracoes_comissao;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue acessar as configurações de comissão
-- 3. Teste criar/editar configurações de comissão
-- 4. Verifique se os cálculos de comissão ainda funcionam
-- 5. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.configuracoes_comissao DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "configuracoes_comissao_select_policy" ON public.configuracoes_comissao;
-- DROP POLICY IF EXISTS "configuracoes_comissao_insert_policy" ON public.configuracoes_comissao;
-- DROP POLICY IF EXISTS "configuracoes_comissao_update_policy" ON public.configuracoes_comissao;
-- DROP POLICY IF EXISTS "configuracoes_comissao_delete_policy" ON public.configuracoes_comissao;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (estratégia híbrida)
-- 🔄 configuracaoes_comissao - EM CORREÇÃO
-- ⏳ equipamentos_tipos - PRÓXIMA
-- ⏳ grupos_produtos - PRÓXIMA
-- ⏳ configuracaoes_empresa - PRÓXIMA
-- ⏳ notificacoes - PRÓXIMA
-- ⚠️ ordens_servico - CRÍTICA (deixar por último)
-- ⚠️ pagamentos - CRÍTICA (deixar por último)
-- =====================================================
