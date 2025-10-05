-- =====================================================
-- CORREÇÃO RLS INTELIGENTE - CHECKLIST_ITENS
-- =====================================================
-- Este script habilita RLS com políticas mais inteligentes
-- que permitem leitura anônima mas protegem escrita

-- 1. HABILITAR RLS NA TABELA
-- =====================================================
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;

-- 2. CRIAR POLÍTICAS INTELIGENTES
-- =====================================================

-- Política para SELECT - Permitir leitura anônima (para APIs)
-- mas também permitir usuários autenticados
CREATE POLICY "checklist_itens_select_policy" ON public.checklist_itens
    FOR SELECT USING (true); -- Permite acesso a todos (anônimo + autenticado)

-- Política para INSERT - Apenas usuários autenticados podem inserir
CREATE POLICY "checklist_itens_insert_policy" ON public.checklist_itens
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE - Apenas usuários autenticados podem atualizar
CREATE POLICY "checklist_itens_update_policy" ON public.checklist_itens
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE - Apenas usuários autenticados podem deletar
CREATE POLICY "checklist_itens_delete_policy" ON public.checklist_itens
    FOR DELETE USING (auth.role() = 'authenticated');

-- 3. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================
-- Execute estas queries para testar:

-- Verificar se RLS está habilitado:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'checklist_itens';

-- Testar acesso anônimo (deve funcionar agora):
-- SELECT COUNT(*) FROM public.checklist_itens;

-- 4. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se o checklist ainda funciona (leitura)
-- 2. Teste se consegue criar/editar itens (escrita)
-- 3. Se funcionar, esta é uma solução híbrida mais segura

-- 5. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.checklist_itens DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "checklist_itens_select_policy" ON public.checklist_itens;
-- DROP POLICY IF EXISTS "checklist_itens_insert_policy" ON public.checklist_itens;
-- DROP POLICY IF EXISTS "checklist_itens_update_policy" ON public.checklist_itens;
-- DROP POLICY IF EXISTS "checklist_itens_delete_policy" ON public.checklist_itens;

-- =====================================================
-- VANTAGENS DESTA ABORDAGEM:
-- ✅ Protege contra inserções/edições não autorizadas
-- ✅ Mantém funcionalidade das APIs (leitura anônima)
-- ✅ Reduz significativamente a superfície de ataque
-- ✅ Permite que o sistema continue funcionando
-- =====================================================
