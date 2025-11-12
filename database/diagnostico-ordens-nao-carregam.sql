-- =====================================================
-- DIAGNÓSTICO: Por que as ordens não estão carregando?
-- =====================================================

-- 1. VERIFICAR SE A COLUNA atendente_id EXISTE
-- =====================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ordens_servico'
  AND column_name = 'atendente_id';

-- 2. VERIFICAR SE HÁ ORDENS COM atendente_id INVÁLIDO (que não existe em usuarios)
-- =====================================================
SELECT 
  COUNT(*) as total_ordens_com_atendente_id_invalido
FROM ordens_servico os
WHERE os.atendente_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = os.atendente_id
  );

-- 3. VERIFICAR SE HÁ PROBLEMAS COM FOREIGN KEY
-- =====================================================
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'ordens_servico'::regclass
  AND conname LIKE '%atendente%';

-- 4. VERIFICAR TOTAL DE ORDENS POR EMPRESA
-- =====================================================
SELECT 
  empresa_id,
  COUNT(*) as total_ordens,
  COUNT(atendente_id) as ordens_com_atendente_id,
  COUNT(*) - COUNT(atendente_id) as ordens_sem_atendente_id
FROM ordens_servico
GROUP BY empresa_id
ORDER BY total_ordens DESC;

-- 5. VERIFICAR SE HÁ ERROS DE PERMISSÃO (RLS)
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'ordens_servico';

-- 6. TESTAR QUERY SIMPLES (sem relacionamentos)
-- =====================================================
SELECT 
  id,
  numero_os,
  empresa_id,
  atendente_id,
  created_at
FROM ordens_servico
LIMIT 5;

