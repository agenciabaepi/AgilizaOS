-- =====================================================
-- CORREÇÃO RLS GRADUAL - CATALOGO_CATEGORIAS
-- =====================================================
-- Este script habilita RLS apenas para a tabela catalogo_categorias
-- para teste gradual sem quebrar o sistema

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
-- Execute primeiro para ver o estado atual:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'catalogo_categorias';

-- 2. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.catalogo_categorias ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política para SELECT - Apenas usuários autenticados podem ver
CREATE POLICY "catalogo_categorias_select_policy" ON public.catalogo_categorias
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT - Apenas usuários autenticados podem inserir
CREATE POLICY "catalogo_categorias_insert_policy" ON public.catalogo_categorias
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE - Apenas usuários autenticados podem atualizar
CREATE POLICY "catalogo_categorias_update_policy" ON public.catalogo_categorias
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE - Apenas usuários autenticados podem deletar
CREATE POLICY "catalogo_categorias_delete_policy" ON public.catalogo_categorias
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'catalogo_categorias';

-- Testar acesso (deve retornar dados se autenticado):
-- SELECT COUNT(*) FROM public.catalogo_categorias;

-- 5. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se a aplicação ainda funciona
-- 2. Verifique se consegue acessar o catálogo
-- 3. Teste criar/editar categorias
-- 4. Se tudo funcionar, podemos prosseguir para a próxima tabela

-- 6. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.catalogo_categorias DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "catalogo_categorias_select_policy" ON public.catalogo_categorias;
-- DROP POLICY IF EXISTS "catalogo_categorias_insert_policy" ON public.catalogo_categorias;
-- DROP POLICY IF EXISTS "catalogo_categorias_update_policy" ON public.catalogo_categorias;
-- DROP POLICY IF EXISTS "catalogo_categorias_delete_policy" ON public.catalogo_categorias;

-- =====================================================
-- PRÓXIMAS TABELAS PARA CORRIGIR (em ordem de prioridade):
-- 1. catalogo_itens (após testar categorias)
-- 2. categorias_produtos
-- 3. equipamentos_tipos
-- 4. grupos_produtos
-- 5. configuracaoes_comissao
-- 6. configuracaoes_empresa
-- 7. checklist_itens
-- 8. notificacoes
-- 9. ordens_servico (CRÍTICA - testar bem antes)
-- 10. pagamentos (CRÍTICA - testar bem antes)
-- =====================================================
