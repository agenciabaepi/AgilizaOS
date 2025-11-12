-- =====================================================
-- ADICIONAR ATENDENTE_ID NAS ORDENS DE SERVIÇO (CORRIGIDO)
-- =====================================================
-- Este script adiciona o campo atendente_id de forma segura

-- 1. ADICIONAR COLUNA (se não existir)
-- =====================================================
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS atendente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- 2. TENTAR PREENCHER COM BASE NO NOME DO ATENDENTE
-- =====================================================
-- Só atualiza se encontrar correspondência exata
UPDATE public.ordens_servico os
SET atendente_id = u.id
FROM public.usuarios u
WHERE os.atendente_id IS NULL
  AND os.atendente IS NOT NULL
  AND os.atendente != ''
  AND LOWER(TRIM(u.nome)) = LOWER(TRIM(os.atendente))
  AND u.empresa_id = os.empresa_id
  AND u.id IS NOT NULL;

-- 3. NÃO FAZER FALLBACK COM UUID HARDCODED
-- =====================================================
-- Removido o UPDATE com UUID fixo para evitar erros de foreign key
-- O atendente_id pode ficar NULL se não houver correspondência

-- 4. CRIAR ÍNDICE (se não existir)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ordens_servico_atendente_id 
  ON public.ordens_servico(atendente_id)
  WHERE atendente_id IS NOT NULL;

-- 5. VERIFICAR RESULTADO
-- =====================================================
-- Execute para verificar:
-- SELECT 
--   COUNT(*) as total_ordens,
--   COUNT(atendente_id) as ordens_com_atendente_id,
--   COUNT(*) - COUNT(atendente_id) as ordens_sem_atendente_id
-- FROM public.ordens_servico;

