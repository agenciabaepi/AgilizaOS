-- =====================================================
-- TESTAR CONTEXTO DE AUTENTICAÇÃO
-- =====================================================
-- Execute este script enquanto estiver autenticado no Supabase
-- para verificar se auth.uid() está funcionando

-- 1. Verificar se auth.uid() retorna algo
SELECT 
    auth.uid() as current_auth_uid,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ auth.uid() está NULL - PROBLEMA!'
        ELSE '✅ auth.uid() está funcionando'
    END as status;

-- 2. Verificar se há usuário correspondente
SELECT 
    u.id,
    u.nome,
    u.email,
    u.auth_user_id,
    u.empresa_id,
    auth.uid() as current_auth_uid,
    CASE 
        WHEN u.auth_user_id = auth.uid() THEN '✅ Match encontrado'
        WHEN u.auth_user_id IS NULL THEN '❌ auth_user_id está NULL na tabela usuarios'
        ELSE '❌ Sem match - auth_user_id diferente'
    END as match_status
FROM usuarios u
WHERE u.auth_user_id = auth.uid()
LIMIT 5;

-- 3. Testar se conseguimos acessar tickets com RLS ativo
-- Esta query deve retornar apenas tickets da empresa do usuário autenticado
SELECT 
    ts.id,
    ts.titulo,
    ts.empresa_id,
    (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1) as usuario_empresa_id,
    CASE 
        WHEN ts.empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1) 
        THEN '✅ Match - deve aparecer'
        ELSE '❌ Sem match - não deve aparecer'
    END as should_show
FROM tickets_suporte ts
LIMIT 10;

