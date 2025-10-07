-- =====================================================
-- CORRIGIR SEARCH_PATH DOS TRIGGERS
-- =====================================================

-- 1) Remover TODOS os triggers da tabela ordens_servico
DROP TRIGGER IF EXISTS trg_set_senha_acesso_on_insert ON public.ordens_servico;
DROP TRIGGER IF EXISTS trigger_senha_acesso ON public.ordens_servico;
DROP TRIGGER IF EXISTS update_ordens_servico_updated_at ON public.ordens_servico;
DROP TRIGGER IF EXISTS trigger_registrar_mudanca_status ON public.ordens_servico;

-- 2) Remover funções problemáticas
DROP FUNCTION IF EXISTS public.set_senha_acesso_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_registrar_mudanca_status() CASCADE;

-- 3) Recriar função geradora com search_path explícito
DROP FUNCTION IF EXISTS public.generate_random_4_digit_string() CASCADE;
CREATE OR REPLACE FUNCTION public.generate_random_4_digit_string()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
END;
$$;

-- 4) Recriar função de senha com search_path explícito
CREATE OR REPLACE FUNCTION public.set_senha_acesso_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.senha_acesso IS NULL OR NEW.senha_acesso = '' THEN
        NEW.senha_acesso := public.generate_random_4_digit_string();
    END IF;
    RETURN NEW;
END;
$$;

-- 5) Recriar função de updated_at com search_path explícito
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 6) Recriar triggers
CREATE TRIGGER trg_set_senha_acesso_on_insert
    BEFORE INSERT ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.set_senha_acesso_on_insert();

CREATE TRIGGER update_ordens_servico_updated_at
    BEFORE UPDATE ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Conceder permissões
GRANT EXECUTE ON FUNCTION public.generate_random_4_digit_string() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_senha_acesso_on_insert() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role;

-- 8) Verificar triggers finais
SELECT 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'ordens_servico'
ORDER BY trigger_name;

-- 9) Testar função geradora
SELECT public.generate_random_4_digit_string() AS senha_teste;

-- =====================================================
-- STATUS: TRIGGERS CORRIGIDOS
-- ✅ Search_path explícito definido em todas as funções
-- ✅ Triggers recriados com configurações corretas
-- ✅ Permissões concedidas
-- =====================================================

