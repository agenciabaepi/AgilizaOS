-- =====================================================
-- Migração de legado: ABERTA / FINALIZADA -> status atuais
-- Objetivo:
-- 1) Remover valores legados nas tabelas operacionais
-- 2) Preservar coerência entre status OS e status técnico
-- 3) Permitir execução idempotente
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1) Catálogo de status fixo
-- -----------------------------------------------------

-- status_fixo (tipo os): ABERTA -> ORÇAMENTO, FINALIZADA -> ENTREGUE
UPDATE status_fixo
SET nome = 'ORÇAMENTO'
WHERE tipo = 'os' AND UPPER(COALESCE(nome, '')) = 'ABERTA';

UPDATE status_fixo
SET nome = 'ENTREGUE'
WHERE tipo = 'os' AND UPPER(COALESCE(nome, '')) = 'FINALIZADA';

-- status_fixo (tipo tecnico): ABERTA -> AGUARDANDO INÍCIO, FINALIZADA -> REPARO CONCLUÍDO
UPDATE status_fixo
SET nome = 'AGUARDANDO INÍCIO'
WHERE tipo = 'tecnico' AND UPPER(COALESCE(nome, '')) = 'ABERTA';

UPDATE status_fixo
SET nome = 'REPARO CONCLUÍDO'
WHERE tipo = 'tecnico' AND UPPER(COALESCE(nome, '')) = 'FINALIZADA';

-- -----------------------------------------------------
-- 2) Catálogo de status por empresa
-- -----------------------------------------------------

UPDATE status
SET nome = 'ORÇAMENTO'
WHERE tipo = 'os' AND UPPER(COALESCE(nome, '')) = 'ABERTA';

UPDATE status
SET nome = 'ENTREGUE'
WHERE tipo = 'os' AND UPPER(COALESCE(nome, '')) = 'FINALIZADA';

UPDATE status
SET nome = 'AGUARDANDO INÍCIO'
WHERE tipo = 'tecnico' AND UPPER(COALESCE(nome, '')) = 'ABERTA';

UPDATE status
SET nome = 'REPARO CONCLUÍDO'
WHERE tipo = 'tecnico' AND UPPER(COALESCE(nome, '')) = 'FINALIZADA';

-- -----------------------------------------------------
-- 3) Dados operacionais
-- -----------------------------------------------------

UPDATE ordens_servico
SET status = 'ORÇAMENTO'
WHERE UPPER(COALESCE(status, '')) = 'ABERTA';

UPDATE ordens_servico
SET status = 'ENTREGUE'
WHERE UPPER(COALESCE(status, '')) = 'FINALIZADA';

UPDATE ordens_servico
SET status_tecnico = 'AGUARDANDO INÍCIO'
WHERE UPPER(COALESCE(status_tecnico, '')) = 'ABERTA';

UPDATE ordens_servico
SET status_tecnico = 'REPARO CONCLUÍDO'
WHERE UPPER(COALESCE(status_tecnico, '')) = 'FINALIZADA';

-- -----------------------------------------------------
-- 4) Histórico de status estruturado
-- -----------------------------------------------------

-- status da OS
UPDATE status_historico
SET status_anterior = 'ORÇAMENTO'
WHERE UPPER(COALESCE(status_anterior, '')) = 'ABERTA';

UPDATE status_historico
SET status_novo = 'ORÇAMENTO'
WHERE UPPER(COALESCE(status_novo, '')) = 'ABERTA';

UPDATE status_historico
SET status_anterior = 'ENTREGUE'
WHERE UPPER(COALESCE(status_anterior, '')) = 'FINALIZADA';

UPDATE status_historico
SET status_novo = 'ENTREGUE'
WHERE UPPER(COALESCE(status_novo, '')) = 'FINALIZADA';

-- status técnico
UPDATE status_historico
SET status_tecnico_anterior = 'AGUARDANDO INÍCIO'
WHERE UPPER(COALESCE(status_tecnico_anterior, '')) = 'ABERTA';

UPDATE status_historico
SET status_tecnico_novo = 'AGUARDANDO INÍCIO'
WHERE UPPER(COALESCE(status_tecnico_novo, '')) = 'ABERTA';

UPDATE status_historico
SET status_tecnico_anterior = 'REPARO CONCLUÍDO'
WHERE UPPER(COALESCE(status_tecnico_anterior, '')) = 'FINALIZADA';

UPDATE status_historico
SET status_tecnico_novo = 'REPARO CONCLUÍDO'
WHERE UPPER(COALESCE(status_tecnico_novo, '')) = 'FINALIZADA';

-- -----------------------------------------------------
-- 5) Histórico textual (os_historico)
-- -----------------------------------------------------

-- Campo texto simples
UPDATE os_historico
SET valor_anterior = 'ORÇAMENTO'
WHERE UPPER(COALESCE(valor_anterior, '')) = 'ABERTA';

UPDATE os_historico
SET valor_novo = 'ORÇAMENTO'
WHERE UPPER(COALESCE(valor_novo, '')) = 'ABERTA';

UPDATE os_historico
SET valor_anterior = 'ENTREGUE'
WHERE UPPER(COALESCE(valor_anterior, '')) = 'FINALIZADA';

UPDATE os_historico
SET valor_novo = 'ENTREGUE'
WHERE UPPER(COALESCE(valor_novo, '')) = 'FINALIZADA';

-- Texto livre
UPDATE os_historico
SET descricao = REPLACE(descricao, 'FINALIZADA', 'REPARO CONCLUÍDO')
WHERE descricao ILIKE '%FINALIZADA%';

UPDATE os_historico
SET descricao = REPLACE(descricao, 'ABERTA', 'ORÇAMENTO')
WHERE descricao ILIKE '%ABERTA%';

UPDATE os_historico
SET detalhes = REPLACE(detalhes::text, 'FINALIZADA', 'REPARO CONCLUÍDO')::jsonb
WHERE detalhes::text ILIKE '%FINALIZADA%';

UPDATE os_historico
SET detalhes = REPLACE(detalhes::text, 'ABERTA', 'ORÇAMENTO')::jsonb
WHERE detalhes::text ILIKE '%ABERTA%';

COMMIT;

-- -----------------------------------------------------
-- Verificação pós-migração (mesma base do script de verificação)
-- -----------------------------------------------------
SELECT 'ordens_servico.status' AS origem, COUNT(*) AS total
FROM ordens_servico
WHERE UPPER(COALESCE(status, '')) IN ('FINALIZADA', 'ABERTA', 'ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO')
UNION ALL
SELECT 'ordens_servico.status_tecnico' AS origem, COUNT(*) AS total
FROM ordens_servico
WHERE UPPER(COALESCE(status_tecnico, '')) IN ('FINALIZADA', 'ABERTA', 'ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO')
UNION ALL
SELECT 'status_historico.status_novo' AS origem, COUNT(*) AS total
FROM status_historico
WHERE UPPER(COALESCE(status_novo, '')) IN ('FINALIZADA', 'ABERTA', 'ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO')
UNION ALL
SELECT 'status_historico.status_tecnico_novo' AS origem, COUNT(*) AS total
FROM status_historico
WHERE UPPER(COALESCE(status_tecnico_novo, '')) IN ('FINALIZADA', 'ABERTA', 'ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

