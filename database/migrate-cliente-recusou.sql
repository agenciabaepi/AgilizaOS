-- =====================================================
-- MIGRAÇÃO: ADICIONAR CAMPO cliente_recusou
-- =====================================================
-- Este campo marca se o cliente recusou o serviço
-- Mantém os valores históricos da OS mas indica que não houve pagamento

-- Adicionar coluna cliente_recusou se não existir
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS cliente_recusou BOOLEAN DEFAULT false;

-- Adicionar comentário para documentação
COMMENT ON COLUMN ordens_servico.cliente_recusou IS 'Indica se o cliente recusou o serviço. Quando true, os valores são mantidos para histórico mas não devem ser contabilizados no financeiro';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ordens_servico' 
AND column_name = 'cliente_recusou';

