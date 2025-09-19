-- =====================================================
-- MIGRAÇÃO: Adicionar campos para contas fixas mensais
-- =====================================================

-- Adicionar colunas para contas fixas mensais
ALTER TABLE contas_pagar 
ADD COLUMN IF NOT EXISTS conta_fixa BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parcelas_totais INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parcela_atual INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_fixa_mes INTEGER DEFAULT 1 CHECK (data_fixa_mes >= 1 AND data_fixa_mes <= 31),
ADD COLUMN IF NOT EXISTS proxima_geracao DATE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN contas_pagar.conta_fixa IS 'Indica se é uma conta fixa mensal';
COMMENT ON COLUMN contas_pagar.parcelas_totais IS 'Total de parcelas da conta fixa';
COMMENT ON COLUMN contas_pagar.parcela_atual IS 'Parcela atual da conta fixa';
COMMENT ON COLUMN contas_pagar.data_fixa_mes IS 'Dia do mês para vencimento (1-31)';
COMMENT ON COLUMN contas_pagar.proxima_geracao IS 'Data da próxima geração automática da conta';

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_contas_pagar_conta_fixa ON contas_pagar(conta_fixa);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_data_fixa_mes ON contas_pagar(data_fixa_mes);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_proxima_geracao ON contas_pagar(proxima_geracao);

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'contas_pagar' 
AND column_name IN ('conta_fixa', 'parcelas_totais', 'parcela_atual', 'data_fixa_mes', 'proxima_geracao')
ORDER BY column_name;
