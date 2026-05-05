-- Corrige comissões com empresa_id nulo usando a empresa da OS relacionada.
-- Segurança: atualiza apenas linhas com empresa_id IS NULL e com ordem_servico_id válida.
UPDATE comissoes_historico ch
SET empresa_id = os.empresa_id
FROM ordens_servico os
WHERE ch.empresa_id IS NULL
  AND ch.ordem_servico_id = os.id
  AND os.empresa_id IS NOT NULL;

-- Verificação rápida (deve retornar 0):
-- SELECT count(*) FROM comissoes_historico WHERE empresa_id IS NULL;
