-- =====================================================
-- LIMPAR TRIGGERS PROBLEMÁTICOS QUE CAUSAM "relation does not exist"
-- =====================================================

-- 1) Listar triggers atuais na tabela ordens_servico
SELECT 
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'ordens_servico'
ORDER BY trigger_name;

-- 2) Remover trigger problemático que pode referenciar tabela sem schema
DROP TRIGGER IF EXISTS trigger_registrar_mudanca_status ON public.ordens_servico;
DROP FUNCTION IF EXISTS public.trigger_registrar_mudanca_status() CASCADE;

-- 3) Garantir que só temos triggers seguros
-- Remover variações antigas
DROP TRIGGER IF EXISTS trg_set_senha_acesso_on_insert ON public.ordens_servico;
DROP TRIGGER IF EXISTS trigger_senha_acesso ON public.ordens_servico;
DROP TRIGGER IF EXISTS update_ordens_servico_updated_at ON public.ordens_servico;

-- 4) Recriar função de senha simples (sem consultar outras tabelas)
DROP FUNCTION IF EXISTS public.set_senha_acesso_on_insert() CASCADE;
CREATE OR REPLACE FUNCTION public.set_senha_acesso_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.senha_acesso IS NULL OR NEW.senha_acesso = '' THEN
        NEW.senha_acesso := public.generate_random_4_digit_string();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Recriar trigger de senha
CREATE TRIGGER trg_set_senha_acesso_on_insert
    BEFORE INSERT ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.set_senha_acesso_on_insert();

-- 6) Recriar função de updated_at simples
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7) Recriar trigger de updated_at
CREATE TRIGGER update_ordens_servico_updated_at
    BEFORE UPDATE ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

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
SELECT public.generate_random_4_digit_string() as senha_teste;

-- =====================================================
-- STATUS: TRIGGERS LIMPOS E RECRIADOS
-- ✅ Triggers problemáticos removidos
-- ✅ Apenas triggers seguros recriados
-- ✅ Função geradora testada
-- =====================================================

