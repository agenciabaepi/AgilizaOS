-- Migração para adicionar campos de senha na tabela ordens_servico
-- Execute este SQL no Supabase SQL Editor

-- Adicionar campos de senha do aparelho
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS senha_aparelho VARCHAR(255);

-- Adicionar campo para padrão de desenho (JSON)
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS senha_padrao TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN ordens_servico.senha_aparelho IS 'Senha/pin do aparelho informado pelo cliente';
COMMENT ON COLUMN ordens_servico.senha_padrao IS 'Padrão de desenho do Android em formato JSON';

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ordens_servico' 
AND column_name IN ('senha_aparelho', 'senha_padrao')
ORDER BY column_name;
