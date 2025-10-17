-- ✅ CRIAR FUNÇÃO QUE ESTÁ FALTANDO
-- Esta função é chamada pelo trigger para gerar senha de acesso automática

CREATE OR REPLACE FUNCTION public.generate_random_4_digit_string()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Gerar um número aleatório de 4 dígitos (0000-9999)
    RETURN LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
END;
$$;

-- ✅ GRANT PERMISSÕES
GRANT EXECUTE ON FUNCTION public.generate_random_4_digit_string() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_random_4_digit_string() TO service_role;

-- ✅ VERIFICAR SE A FUNÇÃO FOI CRIADA
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'generate_random_4_digit_string';

-- ✅ TESTAR A FUNÇÃO
SELECT public.generate_random_4_digit_string() as senha_gerada;





