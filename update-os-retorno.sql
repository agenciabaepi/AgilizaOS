-- Script para atualizar OS de retorno/garantia existentes
-- Este script identifica OS que são retornos baseado em alguns critérios:

-- 1. OS que têm campo os_garantia_id preenchido (referência à OS original)
-- 2. OS que mencionam "retorno" ou "garantia" na observação
-- 3. OS que foram criadas após uma OS original e têm o mesmo cliente

-- Atualizar OS que têm os_garantia_id preenchido
UPDATE ordens_servico 
SET tipo = 'Retorno'
WHERE os_garantia_id IS NOT NULL 
  AND tipo = 'Normal';

-- Atualizar OS que mencionam "retorno" na observação
UPDATE ordens_servico 
SET tipo = 'Retorno'
WHERE (observacao ILIKE '%retorno%' OR observacao ILIKE '%garantia%')
  AND tipo = 'Normal';

-- Verificar quantas OS foram atualizadas
SELECT 
  COUNT(*) as total_os_retorno,
  COUNT(CASE WHEN os_garantia_id IS NOT NULL THEN 1 END) as com_os_garantia_id,
  COUNT(CASE WHEN observacao ILIKE '%retorno%' OR observacao ILIKE '%garantia%' THEN 1 END) as com_palavra_chave
FROM ordens_servico 
WHERE tipo = 'Retorno';

-- Listar todas as OS de retorno para verificação
SELECT 
  id,
  numero_os,
  tipo,
  os_garantia_id,
  LEFT(observacao, 100) as observacao_preview,
  created_at
FROM ordens_servico 
WHERE tipo = 'Retorno'
ORDER BY created_at DESC;
