-- =====================================================
-- VERIFICAR PROBLEMAS NAS ORDENS DE SERVIÇO
-- =====================================================
-- Execute este script para diagnosticar problemas

-- 1. Verificar se a coluna atendente_id existe e tem constraint
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ordens_servico' 
  AND column_name = 'atendente_id';

-- 2. Verificar constraints de foreign key
-- =====================================================
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'ordens_servico'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'atendente_id';

-- 3. Verificar se há ordens com atendente_id inválido
-- =====================================================
SELECT 
    os.id,
    os.numero_os,
    os.atendente_id,
    os.atendente,
    os.empresa_id
FROM public.ordens_servico os
LEFT JOIN public.usuarios u ON os.atendente_id = u.id
WHERE os.atendente_id IS NOT NULL
  AND u.id IS NULL;

-- 4. Verificar quantas ordens têm atendente_id
-- =====================================================
SELECT 
    COUNT(*) as total_ordens,
    COUNT(atendente_id) as com_atendente_id,
    COUNT(*) - COUNT(atendente_id) as sem_atendente_id
FROM public.ordens_servico;

-- 5. Testar query básica de ordens
-- =====================================================
SELECT 
    id,
    numero_os,
    status,
    empresa_id,
    atendente_id,
    created_at
FROM public.ordens_servico
ORDER BY created_at DESC
LIMIT 5;

