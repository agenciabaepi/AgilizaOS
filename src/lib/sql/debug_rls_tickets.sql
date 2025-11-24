-- =====================================================
-- DEBUG RLS TICKETS - DIAGNÓSTICO
-- =====================================================
-- Execute este script para diagnosticar o problema de RLS

-- 1. Verificar se há usuários com auth_user_id
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(auth_user_id) as usuarios_com_auth_id,
    COUNT(*) - COUNT(auth_user_id) as usuarios_sem_auth_id
FROM usuarios;

-- 2. Verificar se há tickets no banco
SELECT 
    COUNT(*) as total_tickets,
    COUNT(DISTINCT empresa_id) as empresas_com_tickets
FROM tickets_suporte;

-- 3. Verificar se o auth.uid() está funcionando (execute como usuário autenticado)
-- Esta query deve retornar o ID do usuário autenticado
SELECT 
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ auth.uid() está NULL'
        ELSE '✅ auth.uid() está funcionando'
    END as status;

-- 4. Verificar se há usuário correspondente ao auth.uid()
SELECT 
    u.id,
    u.nome,
    u.email,
    u.empresa_id,
    e.nome as empresa_nome,
    auth.uid() as auth_user_id,
    CASE 
        WHEN u.auth_user_id = auth.uid() THEN '✅ Match encontrado'
        ELSE '❌ Sem match'
    END as match_status
FROM usuarios u
LEFT JOIN empresas e ON e.id = u.empresa_id
WHERE u.auth_user_id = auth.uid()
LIMIT 5;

-- 5. Testar se a política está funcionando (deve retornar apenas tickets da empresa do usuário)
SELECT 
    ts.id,
    ts.titulo,
    ts.empresa_id,
    u.empresa_id as usuario_empresa_id,
    CASE 
        WHEN ts.empresa_id = u.empresa_id THEN '✅ Match'
        ELSE '❌ Sem match'
    END as match_status
FROM tickets_suporte ts
CROSS JOIN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
) u
LIMIT 10;

-- 6. Verificar políticas ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NULL THEN '❌ USING vazio'
        ELSE '✅ USING definido'
    END as using_status,
    CASE 
        WHEN with_check IS NULL THEN '❌ WITH CHECK vazio'
        ELSE '✅ WITH CHECK definido'
    END as with_check_status
FROM pg_policies 
WHERE tablename IN ('tickets_suporte', 'tickets_comentarios')
ORDER BY tablename, policyname;

