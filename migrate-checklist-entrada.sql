-- Migração para adicionar coluna checklist_entrada na tabela ordens_servico
-- Esta coluna armazenará o checklist de entrada como JSON

ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS checklist_entrada TEXT;

-- Comentário da coluna para documentação
COMMENT ON COLUMN ordens_servico.checklist_entrada IS 'Checklist de entrada do aparelho armazenado como JSON com os testes realizados (alto-falante, microfone, câmeras, etc.)';

-- Exemplo de estrutura JSON que será armazenada:
-- {
--   "altoFalante": true,
--   "microfone": false,
--   "cameraFrontal": true,
--   "cameraTraseira": true,
--   "conectores": false,
--   "botoes": true,
--   "vibracao": true,
--   "wifi": true,
--   "bluetooth": false,
--   "biometria": true,
--   "carga": true,
--   "toqueTela": true
-- }
