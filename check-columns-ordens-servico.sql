-- =====================================================
-- VERIFICAR COLUNAS DA TABELA ORDENS_SERVICO
-- =====================================================

-- Verificar todas as colunas da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ordens_servico'
ORDER BY ordinal_position;

-- =====================================================
-- VERIFICAR SE updated_at EXISTE
-- =====================================================

-- Verificar especificamente se updated_at existe
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ordens_servico'
AND column_name IN ('updated_at', 'created_at', 'status_tecnico', 'status');





