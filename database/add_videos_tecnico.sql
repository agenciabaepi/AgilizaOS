-- Adicionar coluna videos_tecnico na tabela ordens_servico
-- Armazena URLs dos vídeos anexados pelo técnico (separadas por vírgula, igual imagens_tecnico)

ALTER TABLE ordens_servico
ADD COLUMN IF NOT EXISTS videos_tecnico TEXT;

COMMENT ON COLUMN ordens_servico.videos_tecnico IS 'URLs dos vídeos anexados pelo técnico na bancada (até 1 min, separadas por vírgula)';
