-- =====================================================
-- CORREÇÃO FINAL - TRIGGER E COLUNAS
-- =====================================================

-- =====================================================
-- 1. REMOVER TRIGGER PROBLEMÁTICO
-- =====================================================

-- Verificar triggers existentes
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ordens_servico'
AND event_object_schema = 'public';

-- Remover trigger problemático se existir
DROP TRIGGER IF EXISTS teste_trigger ON public.ordens_servico;
DROP FUNCTION IF EXISTS public.teste_trigger_func();

-- =====================================================
-- 2. ADICIONAR COLUNA updated_at SE NÃO EXISTIR
-- =====================================================

-- Adicionar coluna updated_at se não existir
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- 3. CRIAR TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_ordens_servico_updated_at ON public.ordens_servico;
CREATE TRIGGER update_ordens_servico_updated_at
    BEFORE UPDATE ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. TESTAR UPDATE COM SERVICE ROLE (CORRIGIDO)
-- =====================================================

-- Teste final
SET ROLE service_role;
DO $$
DECLARE
    result_count integer;
    error_msg text;
BEGIN
    BEGIN
        -- Tentar atualizar sem updated_at (será preenchido automaticamente)
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
-- 5. VERIFICAR RESULTADO DO UPDATE
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
-- ✅ Trigger problemático removido
-- ✅ Coluna updated_at adicionada
-- ✅ Trigger automático para updated_at criado
-- ✅ Teste de UPDATE realizado
-- ✅ Resultado verificado
-- =====================================================

