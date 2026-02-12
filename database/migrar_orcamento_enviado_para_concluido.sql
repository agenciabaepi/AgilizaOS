-- =====================================================
-- Migração de legado: ORÇAMENTO ENVIADO -> ORÇAMENTO CONCLUÍDO
-- Objetivo:
-- 1) Remover conflitos de nomenclatura no fluxo de status
-- 2) Preservar histórico e consistência entre OS e técnico
-- 3) Ser idempotente (pode rodar mais de uma vez)
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1) Tabelas de catálogo de status
-- -----------------------------------------------------

-- status_fixo: se já existe "ORÇAMENTO CONCLUÍDO" para o mesmo tipo,
-- removemos o legado; senão renomeamos o legado.
DELETE FROM status_fixo sf
WHERE UPPER(sf.nome) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO')
  AND EXISTS (
    SELECT 1
    FROM status_fixo sf2
    WHERE sf2.tipo = sf.tipo
      AND UPPER(sf2.nome) IN ('ORÇAMENTO CONCLUÍDO', 'ORCAMENTO CONCLUIDO')
  );

UPDATE status_fixo
SET nome = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(nome) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

-- status (customizado por empresa): mesma estratégia
DELETE FROM status s
WHERE UPPER(s.nome) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO')
  AND EXISTS (
    SELECT 1
    FROM status s2
    WHERE s2.tipo = s.tipo
      AND s2.empresa_id = s.empresa_id
      AND UPPER(s2.nome) IN ('ORÇAMENTO CONCLUÍDO', 'ORCAMENTO CONCLUIDO')
  );

UPDATE status
SET nome = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(nome) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

-- -----------------------------------------------------
-- 2) Dados operacionais
-- -----------------------------------------------------

UPDATE ordens_servico
SET status = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(status, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

UPDATE ordens_servico
SET status_tecnico = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(status_tecnico, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

-- -----------------------------------------------------
-- 3) Histórico de status (estrutura dedicada)
-- -----------------------------------------------------

UPDATE status_historico
SET status_anterior = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(status_anterior, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

UPDATE status_historico
SET status_novo = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(status_novo, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

UPDATE status_historico
SET status_tecnico_anterior = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(status_tecnico_anterior, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

UPDATE status_historico
SET status_tecnico_novo = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(status_tecnico_novo, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

-- -----------------------------------------------------
-- 4) Histórico detalhado textual (os_historico)
-- -----------------------------------------------------

UPDATE os_historico
SET valor_anterior = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(valor_anterior, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

UPDATE os_historico
SET valor_novo = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(valor_novo, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');

UPDATE os_historico
SET descricao = REPLACE(descricao, 'ORÇAMENTO ENVIADO', 'ORÇAMENTO CONCLUÍDO')
WHERE descricao ILIKE '%ORÇAMENTO ENVIADO%';

UPDATE os_historico
SET descricao = REPLACE(descricao, 'ORCAMENTO ENVIADO', 'ORÇAMENTO CONCLUÍDO')
WHERE descricao ILIKE '%ORCAMENTO ENVIADO%';

UPDATE os_historico
SET detalhes = REPLACE(detalhes::text, 'ORÇAMENTO ENVIADO', 'ORÇAMENTO CONCLUÍDO')::jsonb
WHERE detalhes::text ILIKE '%ORÇAMENTO ENVIADO%';

UPDATE os_historico
SET detalhes = REPLACE(detalhes::text, 'ORCAMENTO ENVIADO', 'ORÇAMENTO CONCLUÍDO')::jsonb
WHERE detalhes::text ILIKE '%ORCAMENTO ENVIADO%';

COMMIT;

-- -----------------------------------------------------
-- Verificação pós-migração
-- -----------------------------------------------------
SELECT 'status_fixo_legado' AS origem, COUNT(*) AS total
FROM status_fixo
WHERE UPPER(nome) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO')
UNION ALL
SELECT 'status_legado' AS origem, COUNT(*) AS total
FROM status
WHERE UPPER(nome) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO')
UNION ALL
SELECT 'ordens_status_legado' AS origem, COUNT(*) AS total
FROM ordens_servico
WHERE UPPER(COALESCE(status, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO')
UNION ALL
SELECT 'ordens_status_tecnico_legado' AS origem, COUNT(*) AS total
FROM ordens_servico
WHERE UPPER(COALESCE(status_tecnico, '')) IN ('ORÇAMENTO ENVIADO', 'ORCAMENTO ENVIADO');
