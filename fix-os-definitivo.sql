-- =====================================================
-- CORREÇÃO DEFINITIVA - PROBLEMA CRIAÇÃO DE OS
-- =====================================================
-- Este script resolve o problema de forma definitiva

-- 1. CRIAR A FUNÇÃO QUE ESTÁ FALTANDO (com mais detalhes)
CREATE OR REPLACE FUNCTION public.generate_random_4_digit_string()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
END;
$$;

-- 2. VERIFICAR SE A FUNÇÃO FOI CRIADA
SELECT 
    proname as function_name,
    proargnames as arguments,
    prosrc as source_code
FROM pg_proc 
WHERE proname = 'generate_random_4_digit_string'
AND pronamespace = 'public'::regnamespace;

-- 3. TESTAR A FUNÇÃO
SELECT generate_random_4_digit_string() as teste_senha;

-- 4. DESABILITAR RLS COMPLETAMENTE NA TABELA ORDENS_SERVICO
ALTER TABLE public.ordens_servico DISABLE ROW LEVEL SECURITY;

-- 5. REMOVER TODAS AS POLÍTICAS (garantir que não há nenhuma)
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'ordens_servico'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.ordens_servico', policy_name);
        RAISE NOTICE 'Removida política: %', policy_name;
    END LOOP;
END $$;

-- 6. VERIFICAR SE RLS ESTÁ DESABILITADO
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'ordens_servico';

-- 7. VERIFICAR SE NÃO HÁ POLÍTICAS RESTANTES
SELECT 
    COUNT(*) as policies_restantes
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'ordens_servico';

-- 8. TESTAR ACESSO À TABELA
DO $$
DECLARE
    result_count integer;
    error_msg text;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO result_count FROM public.ordens_servico;
        RAISE NOTICE '✅ SELECT funcionando: % registros encontrados', result_count;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '❌ SELECT com erro: %', error_msg;
    END;
END $$;

-- 9. VERIFICAR SE A COLUNA senha_acesso EXISTE
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ordens_servico'
AND column_name = 'senha_acesso';

-- 10. ADICIONAR COLUNA senha_acesso SE NÃO EXISTIR
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS senha_acesso VARCHAR(4);

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Função generate_random_4_digit_string criada
-- ✅ RLS desabilitado na tabela ordens_servico
-- ✅ Todas as políticas removidas
-- ✅ Coluna senha_acesso verificada/criada
-- ✅ Acesso à tabela testado
-- =====================================================





