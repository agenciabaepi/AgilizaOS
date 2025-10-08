-- Script para adicionar o campo equipamento_categoria à tabela checklist_itens
-- Execute este SQL no Supabase SQL Editor

-- Adicionar coluna equipamento_categoria se não existir
ALTER TABLE checklist_itens 
ADD COLUMN IF NOT EXISTS equipamento_categoria VARCHAR(100);

-- Adicionar comentário para a nova coluna
COMMENT ON COLUMN checklist_itens.equipamento_categoria IS 'Categoria do equipamento (ex: CONTROLE DE PORTÃO, AR CONDICIONADO, etc.)';

-- Criar índice para performance (opcional)
CREATE INDEX IF NOT EXISTS idx_checklist_itens_equipamento_categoria ON checklist_itens(equipamento_categoria);

-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'checklist_itens' 
AND column_name = 'equipamento_categoria';
