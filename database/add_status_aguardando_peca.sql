-- =====================================================
-- Script para adicionar o status "AGUARDANDO PEÇA"
-- na tabela status_fixo (status globais do sistema)
-- =====================================================

-- Status OS
INSERT INTO status_fixo (id, nome, tipo, cor)
SELECT 
    gen_random_uuid(),
    'AGUARDANDO PEÇA',
    'os',
    '#8b5cf6'
WHERE NOT EXISTS (
    SELECT 1 FROM status_fixo 
    WHERE nome = 'AGUARDANDO PEÇA' 
    AND tipo = 'os'
);

-- Status Técnico
INSERT INTO status_fixo (id, nome, tipo, cor)
SELECT 
    gen_random_uuid(),
    'AGUARDANDO PEÇA',
    'tecnico',
    '#8b5cf6'
WHERE NOT EXISTS (
    SELECT 1 FROM status_fixo 
    WHERE nome = 'AGUARDANDO PEÇA' 
    AND tipo = 'tecnico'
);

-- Verificar
SELECT * FROM status_fixo WHERE nome = 'AGUARDANDO PEÇA';
