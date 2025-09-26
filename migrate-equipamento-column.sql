-- Migração para adicionar coluna equipamento na tabela ordens_servico
-- Esta migração garante que a coluna existe para o contador de equipamentos

-- Adicionar coluna equipamento se não existir
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS equipamento VARCHAR(255);

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN ordens_servico.equipamento IS 'Tipo de equipamento para contador de uso (ex: CELULAR, NOTEBOOK)';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ordens_servico' 
AND column_name = 'equipamento';
