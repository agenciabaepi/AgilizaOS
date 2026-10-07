-- =====================================================
-- Normalização de status inconsistentes em ordens_servico
-- 1) status da OS "EM_ANALISE" (gravado pela API antiga) -> "EM ANÁLISE"
-- 2) status técnico legado "em atendimento" -> status atual coerente com a OS
-- 3) OS parada em ORÇAMENTO/EM ANÁLISE com técnico em ORÇAMENTO CONCLUÍDO
-- Idempotente: pode ser executado mais de uma vez.
-- =====================================================

-- Prévia do que será alterado
SELECT 'status EM_ANALISE' AS caso, COUNT(*) AS total
FROM ordens_servico
WHERE status = 'EM_ANALISE'
UNION ALL
SELECT 'status_tecnico em atendimento', COUNT(*)
FROM ordens_servico
WHERE LOWER(TRIM(COALESCE(status_tecnico, ''))) = 'em atendimento'
UNION ALL
SELECT 'OS atrás do técnico (orçamento concluído)', COUNT(*)
FROM ordens_servico
WHERE UPPER(COALESCE(status_tecnico, '')) IN ('ORÇAMENTO CONCLUÍDO', 'ORCAMENTO CONCLUIDO')
  AND UPPER(COALESCE(status, '')) IN ('EM_ANALISE', 'EM ANÁLISE', 'EM ANALISE', 'ORÇAMENTO', 'ORCAMENTO');

BEGIN;

-- 1) EM_ANALISE -> EM ANÁLISE
UPDATE ordens_servico
SET status = 'EM ANÁLISE'
WHERE status = 'EM_ANALISE';

UPDATE status_historico
SET status_anterior = 'EM ANÁLISE'
WHERE status_anterior = 'EM_ANALISE';

UPDATE status_historico
SET status_novo = 'EM ANÁLISE'
WHERE status_novo = 'EM_ANALISE';

-- 2) "em atendimento" era o valor padrão antigo na criação (técnico nunca iniciou)
UPDATE ordens_servico
SET status_tecnico = CASE
  WHEN UPPER(COALESCE(status, '')) = 'CLIENTE RECUSOU' THEN 'CLIENTE RECUSOU'
  WHEN UPPER(COALESCE(status, '')) = 'APROVADO' THEN 'APROVADO'
  WHEN UPPER(COALESCE(status, '')) IN ('EM ANÁLISE', 'EM ANALISE') THEN 'EM ANÁLISE'
  ELSE 'AGUARDANDO INÍCIO'
END
WHERE LOWER(TRIM(COALESCE(status_tecnico, ''))) = 'em atendimento';

-- 3) Técnico já concluiu o orçamento, mas a OS ficou para trás
UPDATE ordens_servico
SET status = 'ORÇAMENTO CONCLUÍDO'
WHERE UPPER(COALESCE(status_tecnico, '')) IN ('ORÇAMENTO CONCLUÍDO', 'ORCAMENTO CONCLUIDO')
  AND UPPER(COALESCE(status, '')) IN ('EM ANÁLISE', 'EM ANALISE', 'ORÇAMENTO', 'ORCAMENTO');

COMMIT;

-- Verificação pós-normalização (todos devem ser 0)
SELECT 'status EM_ANALISE' AS caso, COUNT(*) AS total
FROM ordens_servico
WHERE status = 'EM_ANALISE'
UNION ALL
SELECT 'status_tecnico em atendimento', COUNT(*)
FROM ordens_servico
WHERE LOWER(TRIM(COALESCE(status_tecnico, ''))) = 'em atendimento'
UNION ALL
SELECT 'OS atrás do técnico (orçamento concluído)', COUNT(*)
FROM ordens_servico
WHERE UPPER(COALESCE(status_tecnico, '')) IN ('ORÇAMENTO CONCLUÍDO', 'ORCAMENTO CONCLUIDO')
  AND UPPER(COALESCE(status, '')) IN ('EM ANÁLISE', 'EM ANALISE', 'ORÇAMENTO', 'ORCAMENTO');
