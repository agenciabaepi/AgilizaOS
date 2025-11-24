-- =====================================================
-- CORRIGIR DADOS INCONSISTENTES EM TICKETS
-- =====================================================
-- Execute este script APÓS verificar_dados_tickets.sql
-- para corrigir problemas encontrados

-- 1. Remover usuario_id de tickets onde o usuário não existe mais
UPDATE tickets_suporte
SET usuario_id = NULL
WHERE usuario_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id = tickets_suporte.usuario_id
);

-- 2. Verificar se há tickets com empresa_id inválido
-- Se houver, você precisará decidir o que fazer com eles
-- (deletar, mover para outra empresa, etc.)
SELECT 
    ts.id,
    ts.titulo,
    ts.empresa_id,
    'Este ticket tem empresa_id inválido' as problema
FROM tickets_suporte ts
WHERE NOT EXISTS (
    SELECT 1 FROM empresas WHERE id = ts.empresa_id
);

-- NOTA: Se houver tickets com empresa_id inválido, você pode:
-- - Deletá-los: DELETE FROM tickets_suporte WHERE empresa_id NOT IN (SELECT id FROM empresas);
-- - Ou mover para uma empresa padrão (se houver)

-- 3. Verificar se há comentários órfãos (ticket_id que não existe)
SELECT 
    COUNT(*) as comentarios_orfaos
FROM tickets_comentarios tc
WHERE NOT EXISTS (
    SELECT 1 FROM tickets_suporte WHERE id = tc.ticket_id
);

-- 4. Remover comentários órfãos (se houver)
DELETE FROM tickets_comentarios
WHERE NOT EXISTS (
    SELECT 1 FROM tickets_suporte WHERE id = tickets_comentarios.ticket_id
);

