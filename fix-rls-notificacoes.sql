-- =====================================================
-- CORREÇÃO RLS GRADUAL - NOTIFICACOES
-- =====================================================
-- Este script habilita RLS apenas para a tabela notificacoes
-- para teste gradual sem quebrar o sistema

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'notificacoes';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Usuários só veem suas próprias notificações
CREATE POLICY "notificacoes_select_policy" ON public.notificacoes
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        user_id = auth.uid()
    );

-- Política para INSERT - Usuários podem criar notificações para si mesmos
CREATE POLICY "notificacoes_insert_policy" ON public.notificacoes
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        user_id = auth.uid()
    );

-- Política para UPDATE - Usuários podem atualizar suas próprias notificações
CREATE POLICY "notificacoes_update_policy" ON public.notificacoes
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        user_id = auth.uid()
    );

-- Política para DELETE - Usuários podem deletar suas próprias notificações
CREATE POLICY "notificacoes_delete_policy" ON public.notificacoes
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        user_id = auth.uid()
    );

-- 4. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'notificacoes';

-- Testar acesso (deve retornar apenas notificações do usuário logado):
-- SELECT COUNT(*) FROM public.notificacoes;

-- Ver notificações disponíveis:
-- SELECT id, titulo, lida, created_at FROM public.notificacoes ORDER BY created_at DESC;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue ver suas notificações
-- 3. Teste marcar notificações como lidas
-- 4. Verifique se não consegue ver notificações de outros usuários
-- 5. Teste se o sistema de notificações ainda funciona
-- 6. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.notificacoes DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "notificacoes_select_policy" ON public.notificacoes;
-- DROP POLICY IF EXISTS "notificacoes_insert_policy" ON public.notificacoes;
-- DROP POLICY IF EXISTS "notificacoes_update_policy" ON public.notificacoes;
-- DROP POLICY IF EXISTS "notificacoes_delete_policy" ON public.notificacoes;

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
-- 🔄 notificacoes - EM TESTE
-- ⏳ ordens_servico - PENDENTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================

