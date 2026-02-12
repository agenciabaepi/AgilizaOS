-- Verificação rápida de status legados relacionados a comissões

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

