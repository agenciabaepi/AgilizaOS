-- =====================================================
-- VERIFICAR ESTRUTURA DA TABELA comissoes_historico
-- =====================================================

-- 1. Verificar se a tabela existe e sua estrutura
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'comissoes_historico'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar se há registros na tabela
SELECT COUNT(*) as total_registros
FROM comissoes_historico;

-- 3. Verificar registros recentes (últimos 10)
SELECT *
FROM comissoes_historico
ORDER BY created_at DESC
LIMIT 10;

