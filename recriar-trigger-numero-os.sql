-- =====================================================
-- RECRIAR APENAS O TRIGGER PARA GERAR numero_os
-- =====================================================

-- 1) Criar função para gerar numero_os (retorna TRIGGER)
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
        RAISE NOTICE 'Gerado numero_os: % para empresa: %', proximo_numero, NEW.empresa_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2) Criar trigger para gerar numero_os automaticamente
DROP TRIGGER IF EXISTS trg_gerar_numero_os ON public.ordens_servico;
CREATE TRIGGER trg_gerar_numero_os
    BEFORE INSERT ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_numero_os_trigger();

-- 3) Criar função para gerar senha de acesso
CREATE OR REPLACE FUNCTION public.set_senha_acesso_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se senha_acesso não foi fornecida, gerar automaticamente
    IF NEW.senha_acesso IS NULL OR NEW.senha_acesso = '' THEN
        NEW.senha_acesso := public.generate_random_4_digit_string();
        RAISE NOTICE 'Gerada senha_acesso: %', NEW.senha_acesso;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4) Criar trigger para gerar senha de acesso
CREATE TRIGGER trg_set_senha_acesso
    BEFORE INSERT ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.set_senha_acesso_trigger();

-- 5) Conceder permissões
GRANT EXECUTE ON FUNCTION public.gerar_numero_os_trigger() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_senha_acesso_trigger() TO authenticated, service_role;

-- 6) Verificar triggers criados
SELECT 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'ordens_servico'
ORDER BY trigger_name;

-- 7) Testar função geradora
SELECT public.generate_random_4_digit_string() AS senha_teste;

-- =====================================================
-- STATUS: TRIGGERS ESSENCIAIS RECRIADOS
-- ✅ Trigger para gerar numero_os (sequencial)
-- ✅ Trigger para gerar senha_acesso (4 dígitos)
-- ✅ Permissões concedidas
-- =====================================================

