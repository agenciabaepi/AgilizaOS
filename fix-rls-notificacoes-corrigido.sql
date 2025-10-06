-- =====================================================
-- CORREÇÃO RLS GRADUAL - NOTIFICACOES (CORRIGIDO)
-- =====================================================
-- Este script habilita RLS para notificacoes com a estrutura correta da tabela

-- 1. PRIMEIRO, VERIFICAR ESTRUTURA DA TABELA
-- =====================================================
-- Execute para ver as colunas disponíveis:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notificacoes' AND table_schema = 'public';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA (USANDO COLUNAS CORRETAS)
-- =====================================================

-- Política para SELECT - Permitir que TODOS leiam notificações
-- (Como não temos user_id, vamos permitir leitura para todos por enquanto)
CREATE POLICY "notificacoes_select_policy" ON public.notificacoes
    FOR SELECT USING (true);

-- Política para INSERT - Permitir que TODOS insiram notificações
CREATE POLICY "notificacoes_insert_policy" ON public.notificacoes
    FOR INSERT WITH CHECK (true);

-- Política para UPDATE - Permitir que TODOS atualizem notificações
CREATE POLICY "notificacoes_update_policy" ON public.notificacoes
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Política para DELETE - Permitir que TODOS deletem notificações
CREATE POLICY "notificacoes_delete_policy" ON public.notificacoes
    FOR DELETE USING (true);

-- 4. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'notificacoes';

-- Testar acesso:
-- SELECT COUNT(*) FROM public.notificacoes;

-- Ver notificações disponíveis:
-- SELECT * FROM public.notificacoes LIMIT 5;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue ver notificações
-- 3. Teste marcar notificações como lidas
-- 4. Teste se o sistema de notificações ainda funciona
-- 5. Se tudo funcionar, podemos prosseguir para a próxima tabela

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
-- 🔄 notificacoes - CORRIGINDO ESTRUTURA
-- ⏳ ordens_servico - PENDENTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================

