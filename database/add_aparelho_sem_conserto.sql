-- ============================================================
-- Script para adicionar campo aparelho_sem_conserto na tabela ordens_servico
-- Este campo indica quando um aparelho não teve conserto possível
-- ============================================================

-- Adicionar coluna aparelho_sem_conserto (boolean, default false)
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS aparelho_sem_conserto BOOLEAN DEFAULT FALSE;

-- Adicionar comentário na coluna
COMMENT ON COLUMN ordens_servico.aparelho_sem_conserto IS 'Indica se o aparelho não teve conserto possível (sem condições de reparo)';

-- Criar índice para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_ordens_servico_aparelho_sem_conserto 
ON ordens_servico(aparelho_sem_conserto) 
WHERE aparelho_sem_conserto = TRUE;
