-- Adiciona coluna para armazenar o atendente responsável pela abertura da OS
ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS atendente_id UUID REFERENCES usuarios(id);

-- Tentativa de preenchimento inicial com base no nome do atendente já salvo
UPDATE ordens_servico os
SET atendente_id = u.id
FROM usuarios u
WHERE os.atendente_id IS NULL
  AND os.atendente IS NOT NULL
  AND LOWER(u.nome) = LOWER(os.atendente)
  AND u.empresa_id = os.empresa_id;

-- Fallback: se ainda não encontrou, usar responsável padrão informado
UPDATE ordens_servico
SET atendente_id = '21ff8aab-983e-443d-8792-95ed7c51c9a3'::uuid
WHERE atendente_id IS NULL;

-- Índice para consultas futuras
CREATE INDEX IF NOT EXISTS idx_ordens_servico_atendente_id ON ordens_servico(atendente_id);

