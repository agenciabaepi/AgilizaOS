-- =====================================================
-- DIAGNÓSTICO DO PROBLEMA DE LOGIN
-- =====================================================

-- =====================================================
-- 1. VERIFICAR USUÁRIOS EXISTENTES
-- =====================================================

-- Buscar todos os usuários na tabela usuarios
SELECT 
    id,
    nome,
    email,
    auth_user_id,
    empresa_id,
    nivel,
    created_at
FROM public.usuarios 
ORDER BY created_at DESC;

-- =====================================================
-- 2. VERIFICAR SE HÁ USUÁRIO COM NOME "wdglp"
-- =====================================================

-- Buscar especificamente por "wdglp"
SELECT 
    id,
    nome,
    email,
    auth_user_id,
    empresa_id,
    nivel
FROM public.usuarios 
WHERE nome ILIKE '%wdglp%' 
   OR email ILIKE '%wdglp%'
   OR auth_user_id::text ILIKE '%wdglp%';

-- =====================================================
-- 3. VERIFICAR RLS E POLÍTICAS
-- =====================================================

-- Verificar status RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ATIVO'
        ELSE '❌ RLS DESABILITADO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename = 'usuarios';

-- Verificar políticas na tabela usuarios
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as condition,
    with_check as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'usuarios';

-- =====================================================
-- 4. TESTAR SELECT DIRETO NA TABELA USUARIOS
-- =====================================================

-- Teste 1: Como usuário autenticado
SELECT 
    COUNT(*) as total_usuarios_autenticado
FROM public.usuarios;

-- Teste 2: Como service_role
SET ROLE service_role;
SELECT 
    COUNT(*) as total_usuarios_service_role
FROM public.usuarios;
RESET ROLE;

-- =====================================================
-- 5. VERIFICAR FUNÇÕES DE AUTENTICAÇÃO
-- =====================================================

-- Testar se as funções auth funcionam
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- =====================================================
-- 6. CRIAR USUÁRIO DE TESTE SE NECESSÁRIO
-- =====================================================

-- Verificar se precisamos criar um usuário de teste
-- (Só executar se não houver usuários)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios LIMIT 1) THEN
        RAISE NOTICE '❌ Nenhum usuário encontrado na tabela usuarios';
        RAISE NOTICE '💡 Pode ser necessário criar um usuário de teste';
    ELSE
        RAISE NOTICE '✅ Usuários encontrados na tabela usuarios';
    END IF;
END $$;

-- =====================================================
-- STATUS DO DIAGNÓSTICO:
-- ✅ Usuários existentes verificados
-- ✅ Busca específica por "wdglp" realizada
-- ✅ RLS e políticas verificadas
-- ✅ Testes de SELECT realizados
-- ✅ Funções de autenticação testadas
-- ✅ Verificação de necessidade de usuário de teste
-- =====================================================





