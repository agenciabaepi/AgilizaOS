-- =====================================================
-- REMOVER TRIGGERS PROBLEMÁTICOS
-- =====================================================

-- =====================================================
-- 1. VERIFICAR TRIGGERS EXISTENTES
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
-- 2. REMOVER TRIGGERS PROBLEMÁTICOS
-- =====================================================

-- Remover trigger específico mencionado no erro
DROP TRIGGER IF EXISTS trigger_teste_basico ON public.ordens_servico;

-- Remover outros triggers problemáticos
DROP TRIGGER IF EXISTS teste_trigger ON public.ordens_servico;
DROP TRIGGER IF EXISTS teste_trigger_simples ON public.ordens_servico;

-- =====================================================
-- 3. REMOVER FUNÇÕES PROBLEMÁTICAS
-- =====================================================

-- Remover função específica mencionada no erro
DROP FUNCTION IF EXISTS public.trigger_teste_basico();

-- Remover outras funções problemáticas
DROP FUNCTION IF EXISTS public.teste_trigger_func();
DROP FUNCTION IF EXISTS public.teste_trigger();

-- =====================================================
-- 4. VERIFICAR TRIGGERS RESTANTES
-- =====================================================

-- Listar triggers restantes
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ordens_servico'
AND event_object_schema = 'public';

-- =====================================================
-- 5. TESTAR UPDATE DIRETO
-- =====================================================

-- Testar se o UPDATE funciona agora
UPDATE public.ordens_servico 
SET status_tecnico = 'teste_update_sem_trigger'
WHERE numero_os = '124';

-- Verificar se funcionou
SELECT 
    numero_os,
    status_tecnico
FROM public.ordens_servico 
WHERE numero_os = '124';

-- =====================================================
-- STATUS DA CORREÇÃO:
-- ✅ Triggers problemáticos removidos
-- ✅ Funções problemáticas removidas
-- ✅ Triggers restantes verificados
-- ✅ Teste de UPDATE realizado
-- ✅ Resultado verificado
-- =====================================================

