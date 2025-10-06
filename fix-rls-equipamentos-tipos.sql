-- =====================================================
-- CORREÇÃO RLS GRADUAL - EQUIPAMENTOS_TIPOS
-- =====================================================
-- Este script habilita RLS apenas para a tabela equipamentos_tipos
-- para teste gradual sem quebrar o sistema

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'equipamentos_tipos';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.equipamentos_tipos ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Usuários autenticados podem ver tipos de equipamentos da sua empresa
CREATE POLICY "equipamentos_tipos_select_policy" ON public.equipamentos_tipos
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT - Usuários autenticados podem criar tipos de equipamentos para sua empresa
CREATE POLICY "equipamentos_tipos_insert_policy" ON public.equipamentos_tipos
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE - Usuários autenticados podem atualizar tipos de equipamentos da sua empresa
CREATE POLICY "equipamentos_tipos_update_policy" ON public.equipamentos_tipos
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE - Usuários autenticados podem deletar tipos de equipamentos da sua empresa
CREATE POLICY "equipamentos_tipos_delete_policy" ON public.equipamentos_tipos
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
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'equipamentos_tipos';

-- Testar acesso (deve retornar apenas tipos de equipamentos da empresa do usuário logado):
-- SELECT COUNT(*) FROM public.equipamentos_tipos;

-- Ver tipos de equipamentos disponíveis:
-- SELECT id, nome, descricao FROM public.equipamentos_tipos ORDER BY nome;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue acessar os tipos de equipamentos
-- 3. Teste criar/editar tipos de equipamentos
-- 4. Verifique se não consegue ver tipos de equipamentos de outras empresas
-- 5. Teste se o cadastro de equipamentos ainda funciona
-- 6. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.equipamentos_tipos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "equipamentos_tipos_select_policy" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "equipamentos_tipos_insert_policy" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "equipamentos_tipos_update_policy" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "equipamentos_tipos_delete_policy" ON public.equipamentos_tipos;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (com política smart)
-- ✅ configuracoes_comissao - CORRIGIDA
-- ✅ configuracoes_empresa - CORRIGIDA
-- 🔄 equipamentos_tipos - EM TESTE
-- ⏳ grupos_produtos - PENDENTE
-- ⏳ notificacoes - PENDENTE
-- ⏳ ordens_servico - PENDENTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================

