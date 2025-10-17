-- =====================================================
-- CORREÇÃO RLS GRADUAL - CONFIGURACOES_EMPRESA
-- =====================================================
-- Este script habilita RLS apenas para a tabela configuracoes_empresa
-- para teste gradual sem quebrar o sistema

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'configuracoes_empresa';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Apenas usuários autenticados podem ver configurações da sua empresa
CREATE POLICY "configuracoes_empresa_select_policy" ON public.configuracoes_empresa
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT - Apenas usuários autenticados podem inserir configurações da sua empresa
CREATE POLICY "configuracoes_empresa_insert_policy" ON public.configuracoes_empresa
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE - Apenas usuários autenticados podem atualizar configurações da sua empresa
CREATE POLICY "configuracoes_empresa_update_policy" ON public.configuracoes_empresa
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE - Apenas usuários autenticados podem deletar configurações da sua empresa
CREATE POLICY "configuracoes_empresa_delete_policy" ON public.configuracoes_empresa
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
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'configuracoes_empresa';

-- Testar acesso (deve retornar apenas configurações da empresa do usuário logado):
-- SELECT COUNT(*) FROM public.configuracoes_empresa;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue acessar as configurações da empresa
-- 3. Teste criar/editar configurações da empresa
-- 4. Verifique se não consegue ver configurações de outras empresas
-- 5. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.configuracoes_empresa DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "configuracoes_empresa_select_policy" ON public.configuracoes_empresa;
-- DROP POLICY IF EXISTS "configuracoes_empresa_insert_policy" ON public.configuracoes_empresa;
-- DROP POLICY IF EXISTS "configuracoes_empresa_update_policy" ON public.configuracoes_empresa;
-- DROP POLICY IF EXISTS "configuracoes_empresa_delete_policy" ON public.configuracoes_empresa;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (com política smart)
-- ✅ configuracoes_comissao - CORRIGIDA
-- 🔄 configuracoes_empresa - EM TESTE
-- ⏳ equipamentos_tipos - PENDENTE
-- ⏳ grupos_produtos - PENDENTE
-- ⏳ notificacoes - PENDENTE
-- ⏳ ordens_servico - PENDENTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================





