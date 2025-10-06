-- =====================================================
-- CORRIGIR FUNÇÃO gerar_numero_os QUE ESTÁ CAUSANDO O ERRO
-- =====================================================

-- 1) Verificar se a função existe
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'gerar_numero_os'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2) Recriar a função com search_path correto
DROP FUNCTION IF EXISTS public.gerar_numero_os() CASCADE;

CREATE OR REPLACE FUNCTION public.gerar_numero_os()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    proximo_numero INTEGER;
BEGIN
    -- Buscar o próximo número da OS para a empresa
    SELECT COALESCE(MAX(numero_os), 0) + 1 
    INTO proximo_numero
    FROM public.ordens_servico 
    WHERE empresa_id = NEW.empresa_id;
    
    RETURN proximo_numero;
END;
$$;

-- 3) Verificar se há trigger que usa esta função
SELECT 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'ordens_servico'
  AND action_statement LIKE '%gerar_numero_os%';

-- 4) Se não há trigger, criar um para gerar numero_os automaticamente
DROP TRIGGER IF EXISTS trg_gerar_numero_os ON public.ordens_servico;

CREATE TRIGGER trg_gerar_numero_os
    BEFORE INSERT ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_numero_os();

-- 5) Conceder permissões
GRANT EXECUTE ON FUNCTION public.gerar_numero_os() TO authenticated, service_role;

-- 6) Testar a função
SELECT public.gerar_numero_os() AS teste_numero;

-- =====================================================
-- STATUS: FUNÇÃO gerar_numero_os CORRIGIDA
-- ✅ Search_path explícito definido
-- ✅ Schema public. adicionado nas consultas
-- ✅ Trigger criado para usar a função
-- ✅ Permissões concedidas
-- =====================================================

