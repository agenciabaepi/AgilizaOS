-- Adicionar campo tipo_conta_id na tabela contas_pagar
ALTER TABLE contas_pagar 
ADD COLUMN IF NOT EXISTS tipo_conta_id UUID REFERENCES tipos_conta(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_contas_pagar_tipo_conta_id ON contas_pagar(tipo_conta_id);

-- Atualizar contas existentes para usar tipos padrão
-- Mapear tipos existentes para novos tipos personalizados
UPDATE contas_pagar 
SET tipo_conta_id = (
  SELECT tc.id 
  FROM tipos_conta tc 
  WHERE tc.empresa_id = contas_pagar.empresa_id 
  AND (
    (contas_pagar.tipo = 'fixa' AND tc.nome = 'Aluguel') OR
    (contas_pagar.tipo = 'variavel' AND tc.nome = 'Fornecedor') OR
    (contas_pagar.tipo = 'pecas' AND tc.nome = 'Fornecedor')
  )
  LIMIT 1
)
WHERE tipo_conta_id IS NULL;

-- Se não encontrou correspondência, usar o primeiro tipo disponível para a empresa
UPDATE contas_pagar 
SET tipo_conta_id = (
  SELECT tc.id 
  FROM tipos_conta tc 
  WHERE tc.empresa_id = contas_pagar.empresa_id 
  ORDER BY tc.nome
  LIMIT 1
)
WHERE tipo_conta_id IS NULL;
