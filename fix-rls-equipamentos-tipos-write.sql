-- =====================================================
-- CORREÇÃO RLS WRITE - EQUIPAMENTOS_TIPOS
-- =====================================================
-- Este script corrige as políticas de escrita para equipamentos_tipos
-- Mantém a política de leitura que já funciona

-- 1. REMOVER POLÍTICAS DE ESCRITA ATUAIS
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated insert to equipamentos_tipos" ON public.equipamentos_tipos;
DROP POLICY IF EXISTS "Allow authenticated update to equipamentos_tipos" ON public.equipamentos_tipos;
DROP POLICY IF EXISTS "Allow authenticated delete to equipamentos_tipos" ON public.equipamentos_tipos;

-- 2. CRIAR NOVAS POLÍTICAS DE ESCRITA
-- =====================================================

-- Política para INSERT - Usuários autenticados da empresa podem inserir
CREATE POLICY "Allow company authenticated insert to equipamentos_tipos"
    ON public.equipamentos_tipos FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE - Usuários autenticados da empresa podem atualizar
CREATE POLICY "Allow company authenticated update to equipamentos_tipos"
    ON public.equipamentos_tipos FOR UPDATE
    TO authenticated
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE - Usuários autenticados da empresa podem deletar
CREATE POLICY "Allow company authenticated delete to equipamentos_tipos"
    ON public.equipamentos_tipos FOR DELETE
    TO authenticated
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- 3. TESTAR A APLICAÇÃO
-- =====================================================
-- Após executar este script:
-- 1. Teste se consegue criar novos tipos de equipamentos
-- 2. Teste se consegue editar tipos existentes
-- 3. Teste se consegue deletar tipos (se necessário)
-- 4. Verifique se a listagem ainda funciona
-- 5. Se tudo funcionar, equipamentos_tipos está CORRIGIDA!

-- 4. ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute para reverter:
-- ALTER TABLE public.equipamentos_tipos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all read access to equipamentos_tipos" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "Allow company authenticated insert to equipamentos_tipos" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "Allow company authenticated update to equipamentos_tipos" ON public.equipamentos_tipos;
-- DROP POLICY IF EXISTS "Allow company authenticated delete to equipamentos_tipos" ON public.equipamentos_tipos;

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (com política smart)
-- ✅ configuracoes_comissao - CORRIGIDA
-- ✅ configuracoes_empresa - CORRIGIDA
-- 🔄 equipamentos_tipos - CORRIGINDO ESCRITA
-- ⏳ grupos_produtos - PENDENTE
-- ⏳ notificacoes - PENDENTE
-- ⏳ ordens_servico - PENDENTE
-- ⏳ pagamentos - PENDENTE
-- =====================================================





