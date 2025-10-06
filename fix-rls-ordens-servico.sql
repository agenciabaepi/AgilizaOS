-- =====================================================
-- CORREÇÃO RLS GRADUAL - ORDENS_SERVICO
-- =====================================================
-- Este script habilita RLS apenas para a tabela ordens_servico
-- para teste gradual sem quebrar o sistema

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'ordens_servico';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Usuários autenticados podem ver OS da sua empresa
CREATE POLICY "ordens_servico_select_policy" ON public.ordens_servico
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT - Usuários autenticados podem criar OS para sua empresa
CREATE POLICY "ordens_servico_insert_policy" ON public.ordens_servico
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE - Usuários autenticados podem atualizar OS da sua empresa
CREATE POLICY "ordens_servico_update_policy" ON public.ordens_servico
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE - Usuários autenticados podem deletar OS da sua empresa
CREATE POLICY "ordens_servico_delete_policy" ON public.ordens_servico
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
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'ordens_servico';

-- Testar acesso (deve retornar apenas OS da empresa do usuário logado):
-- SELECT COUNT(*) FROM public.ordens_servico;

-- Ver OS disponíveis:
-- SELECT id, numero_os, cliente_id, status, created_at FROM public.ordens_servico ORDER BY created_at DESC LIMIT 5;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue ver as ordens de serviço
-- 3. Teste criar nova OS
-- 4. Teste editar OS existente
-- 5. Verifique se não consegue ver OS de outras empresas
-- 6. Teste se o sistema de OS ainda funciona completamente
-- 7. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.ordens_servico DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "ordens_servico_select_policy" ON public.ordens_servico;
-- DROP POLICY IF EXISTS "ordens_servico_insert_policy" ON public.ordens_servico;
-- DROP POLICY IF EXISTS "ordens_servico_update_policy" ON public.ordens_servico;
-- DROP POLICY IF EXISTS "ordens_servico_delete_policy" ON public.ordens_servico;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (com política smart)
-- ✅ configuracoes_comissao - CORRIGIDA
-- ✅ configuracoes_empresa - CORRIGIDA
-- ✅ equipamentos_tipos - CORRIGIDA (com política permissiva)
-- ✅ grupos_produtos - CORRIGIDA
-- ✅ notificacoes - CORRIGIDA
-- 🔄 ordens_servico - EM TESTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================

