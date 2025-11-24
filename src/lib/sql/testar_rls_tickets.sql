-- =====================================================
-- TESTAR POLÍTICAS RLS DE TICKETS
-- =====================================================
-- Execute este script para verificar se as políticas RLS estão funcionando
-- Execute como um usuário autenticado (não admin)

-- 1. Verificar se o RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tickets_suporte', 'tickets_comentarios');

-- 2. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('tickets_suporte', 'tickets_comentarios')
ORDER BY tablename, policyname;

-- 3. Verificar se o usuário atual tem empresa_id
SELECT 
    u.id,
    u.nome,
    u.email,
    u.empresa_id,
    e.nome as empresa_nome,
    auth.uid() as auth_user_id
FROM usuarios u
LEFT JOIN empresas e ON e.id = u.empresa_id
WHERE u.auth_user_id = auth.uid();

-- 4. Tentar buscar tickets (deve retornar apenas os da empresa do usuário)
SELECT 
    id,
    titulo,
    status,
    empresa_id,
    created_at
FROM tickets_suporte
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verificar se há tickets para a empresa do usuário
SELECT 
    COUNT(*) as total_tickets,
    empresa_id
FROM tickets_suporte
GROUP BY empresa_id;

