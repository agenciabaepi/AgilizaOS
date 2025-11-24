-- =====================================================
-- VERIFICAR E CORRIGIR DADOS INCONSISTENTES EM TICKETS
-- =====================================================

-- 1. Verificar tickets com usuario_id que não existe na tabela usuarios
SELECT 
    ts.id,
    ts.titulo,
    ts.usuario_id as ticket_usuario_id,
    ts.empresa_id as ticket_empresa_id,
    CASE 
        WHEN u.id IS NULL THEN '❌ usuario_id não existe na tabela usuarios'
        ELSE '✅ usuario_id existe'
    END as status_usuario,
    CASE 
        WHEN e.id IS NULL THEN '❌ empresa_id não existe na tabela empresas'
        ELSE '✅ empresa_id existe'
    END as status_empresa
FROM tickets_suporte ts
LEFT JOIN usuarios u ON u.id = ts.usuario_id
LEFT JOIN empresas e ON e.id = ts.empresa_id
WHERE u.id IS NULL OR e.id IS NULL;

-- 2. Verificar se há usuários sem auth_user_id preenchido
SELECT 
    u.id,
    u.nome,
    u.email,
    u.auth_user_id,
    u.empresa_id,
    CASE 
        WHEN u.auth_user_id IS NULL THEN '❌ auth_user_id está NULL'
        ELSE '✅ auth_user_id preenchido'
    END as status
FROM usuarios u
WHERE u.auth_user_id IS NULL
LIMIT 10;

-- 3. Verificar tickets órfãos (sem empresa válida)
SELECT 
    COUNT(*) as tickets_orfos,
    'Tickets com empresa_id que não existe' as descricao
FROM tickets_suporte ts
WHERE NOT EXISTS (
    SELECT 1 FROM empresas e WHERE e.id = ts.empresa_id
);

-- 4. Verificar tickets com usuario_id inválido
SELECT 
    COUNT(*) as tickets_usuario_invalido,
    'Tickets com usuario_id que não existe' as descricao
FROM tickets_suporte ts
WHERE ts.usuario_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM usuarios u WHERE u.id = ts.usuario_id
);

-- 5. Listar todos os tickets com seus relacionamentos
SELECT 
    ts.id,
    ts.titulo,
    ts.empresa_id,
    ts.usuario_id,
    e.nome as empresa_nome,
    u.nome as usuario_nome,
    u.auth_user_id,
    CASE 
        WHEN e.id IS NULL THEN '❌ Empresa não existe'
        WHEN u.id IS NULL AND ts.usuario_id IS NOT NULL THEN '❌ Usuário não existe'
        WHEN u.auth_user_id IS NULL THEN '⚠️ Usuário sem auth_user_id'
        ELSE '✅ Tudo OK'
    END as status_geral
FROM tickets_suporte ts
LEFT JOIN empresas e ON e.id = ts.empresa_id
LEFT JOIN usuarios u ON u.id = ts.usuario_id
ORDER BY ts.created_at DESC
LIMIT 20;

