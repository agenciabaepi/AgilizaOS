-- =====================================================
-- CORREÇÃO CORRETA DO TRIGGER PROBLEMÁTICO
-- =====================================================

-- =====================================================
-- 1. REMOVER TODOS OS TRIGGERS PROBLEMÁTICOS
-- =====================================================

-- Remover o trigger específico mencionado no erro
DROP TRIGGER IF EXISTS teste_trigger_simples ON public.ordens_servico;

-- Remover qualquer outro trigger relacionado
DROP TRIGGER IF EXISTS teste_trigger ON public.ordens_servico;

-- Remover a função problemática (agora que o trigger foi removido)
DROP FUNCTION IF EXISTS public.teste_trigger_func();

-- =====================================================
-- 2. VERIFICAR TRIGGERS RESTANTES
-- =====================================================

-- Listar todos os triggers na tabela ordens_servico
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ordens_servico'
AND event_object_schema = 'public';

-- =====================================================
-- 3. ADICIONAR COLUNA updated_at SE NÃO EXISTIR
-- =====================================================

-- Adicionar coluna updated_at
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- 4. CRIAR TRIGGER CORRETO PARA updated_at
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS update_ordens_servico_updated_at ON public.ordens_servico;
DROP TRIGGER IF EXISTS set_updated_at ON public.ordens_servico;

-- Criar novo trigger
CREATE TRIGGER update_ordens_servico_updated_at
    BEFORE UPDATE ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. TESTAR UPDATE FINAL
-- =====================================================

-- Teste com service role
SET ROLE service_role;
DO $$
DECLARE
    result_count integer;
    error_msg text;
BEGIN
    BEGIN
        UPDATE public.ordens_servico 
        SET status_tecnico = 'em atendimento'
        WHERE numero_os = '124';
        
        GET DIAGNOSTICS result_count = ROW_COUNT;
        RAISE NOTICE '✅ UPDATE funcionou: % registros atualizados', result_count;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '❌ Erro no UPDATE: %', error_msg;
    END;
END $$;
RESET ROLE;

-- =====================================================
-- 6. VERIFICAR RESULTADO
-- =====================================================

-- Verificar se o update funcionou
SELECT 
    id,
    numero_os,
    status,
    status_tecnico,
    updated_at
FROM public.ordens_servico 
WHERE numero_os = '124';

-- =====================================================
-- STATUS DA CORREÇÃO:
-- ✅ Trigger problemático removido corretamente
-- ✅ Função problemática removida
-- ✅ Coluna updated_at adicionada
-- ✅ Trigger correto para updated_at criado
-- ✅ Teste de UPDATE realizado
-- ✅ Resultado verificado
-- =====================================================





