-- =====================================================
-- INICIALIZAR VALORES DE COMISSÃO FIXA
-- =====================================================
-- Este script garante que os campos de comissão fixa tenham valores padrão

-- 1. Atualizar configuracoes_comissao para garantir valores padrão
-- =====================================================
UPDATE configuracoes_comissao
SET 
  tipo_comissao = COALESCE(tipo_comissao, 'porcentagem'),
  comissao_fixa_padrao = COALESCE(comissao_fixa_padrao, 0.00)
WHERE 
  tipo_comissao IS NULL 
  OR comissao_fixa_padrao IS NULL;

-- 2. Verificar resultado
-- =====================================================
SELECT 
  id,
  empresa_id,
  tipo_comissao,
  comissao_padrao,
  comissao_fixa_padrao,
  comissao_apenas_servico,
  comissao_retorno_ativo
FROM configuracoes_comissao;

-- 3. Verificar se os campos existem e têm valores padrão
-- =====================================================
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'configuracoes_comissao'
  AND column_name IN ('tipo_comissao', 'comissao_fixa_padrao')
ORDER BY column_name;

