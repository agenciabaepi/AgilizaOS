-- =====================================================
-- CORRIGIR FUNÇÃO gerar_numero_os PARA FUNCIONAR COMO TRIGGER
-- =====================================================

-- 1) Remover trigger e função incorreta
DROP TRIGGER IF EXISTS trg_gerar_numero_os ON public.ordens_servico;
DROP FUNCTION IF EXISTS public.gerar_numero_os() CASCADE;

-- 2) Criar função que retorna TRIGGER (para usar como trigger)
CREATE OR REPLACE FUNCTION public.gerar_numero_os_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    proximo_numero INTEGER;
BEGIN
    -- Se numero_os não foi fornecido, gerar automaticamente
    IF NEW.numero_os IS NULL THEN
        -- Buscar o próximo número da OS para a empresa
        SELECT COALESCE(MAX(numero_os), 0) + 1 
        INTO proximo_numero
        FROM public.ordens_servico 
        WHERE empresa_id = NEW.empresa_id;
        
        NEW.numero_os := proximo_numero;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3) Criar trigger para gerar numero_os automaticamente
CREATE TRIGGER trg_gerar_numero_os
    BEFORE INSERT ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_numero_os_trigger();

-- 4) Conceder permissões
GRANT EXECUTE ON FUNCTION public.gerar_numero_os_trigger() TO authenticated, service_role;

-- 5) Verificar triggers ativos
SELECT 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'ordens_servico'
ORDER BY trigger_name;

-- =====================================================
-- STATUS: FUNÇÃO TRIGGER CORRIGIDA
-- ✅ Função agora retorna TRIGGER (não INTEGER)
-- ✅ Trigger criado para gerar numero_os automaticamente
-- ✅ Permissões concedidas
-- =====================================================

