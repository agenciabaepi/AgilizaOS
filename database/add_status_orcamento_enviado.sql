-- =====================================================
-- Script para adicionar o status "ORÇAMENTO CONCLUÍDO"
-- na tabela status_fixo (status globais do sistema)
-- =====================================================

-- Status OS
INSERT INTO status_fixo (id, nome, tipo, cor)
SELECT 
    gen_random_uuid(),
    'ORÇAMENTO CONCLUÍDO',
    'os',
    '#f59e0b'
WHERE NOT EXISTS (
    SELECT 1 FROM status_fixo 
    WHERE nome = 'ORÇAMENTO CONCLUÍDO' 
    AND tipo = 'os'
);

-- Status Técnico
INSERT INTO status_fixo (id, nome, tipo, cor)
SELECT 
    gen_random_uuid(),
    'ORÇAMENTO CONCLUÍDO',
    'tecnico',
    '#f59e0b'
WHERE NOT EXISTS (
    SELECT 1 FROM status_fixo 
    WHERE nome = 'ORÇAMENTO CONCLUÍDO' 
    AND tipo = 'tecnico'
);

-- Verificar
SELECT * FROM status_fixo WHERE nome = 'ORÇAMENTO CONCLUÍDO';
