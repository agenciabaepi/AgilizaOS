-- =====================================================
-- ATUALIZAR STATUS PADRÃO DE TICKETS
-- =====================================================
-- Mudar o status padrão de "aberto" para "aguardando_resposta"
-- e atualizar a constraint para incluir "aguardando_resposta"

-- 1. Atualizar o valor padrão da coluna status
ALTER TABLE tickets_suporte 
  ALTER COLUMN status SET DEFAULT 'aguardando_resposta';

-- 2. Verificar se a constraint já inclui "aguardando_resposta"
-- Se não incluir, precisamos recriar a constraint
DO $$
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE tickets_suporte DROP CONSTRAINT IF EXISTS tickets_status_check;
  
  -- Recriar constraint com todos os status válidos
  ALTER TABLE tickets_suporte 
    ADD CONSTRAINT tickets_status_check 
    CHECK (status IN ('aberto', 'em_desenvolvimento', 'aguardando_resposta', 'resolvido', 'fechado'));
END $$;

-- 3. Atualizar tickets existentes que estão como "aberto" para "aguardando_resposta"
-- (opcional - apenas se quiser migrar tickets antigos)
-- UPDATE tickets_suporte 
-- SET status = 'aguardando_resposta' 
-- WHERE status = 'aberto' 
-- AND created_at > NOW() - INTERVAL '1 day'; -- Apenas tickets criados nas últimas 24h

-- Verificar se foi atualizado
SELECT 
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'tickets_suporte'
AND column_name = 'status';

