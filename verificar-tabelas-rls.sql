-- =====================================================
-- VERIFICAÇÃO - STATUS RLS DAS TABELAS
-- =====================================================

-- 1. VERIFICAR TODAS AS TABELAS COM RLS HABILITADO
-- =====================================================
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Habilitado",
    CASE 
        WHEN rowsecurity = true THEN '✅ CORRIGIDA'
        WHEN rowsecurity = false THEN '❌ SEM RLS'
        ELSE '❓ DESCONHECIDO'
    END as "Status"
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. CONTAR TABELAS COM/SEM RLS
-- =====================================================
SELECT 
    'Tabelas com RLS habilitado' as categoria,
    COUNT(*) as quantidade
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
    'Tabelas sem RLS' as categoria,
    COUNT(*) as quantidade
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false

UNION ALL

SELECT 
    'Total de tabelas' as categoria,
    COUNT(*) as quantidade
FROM pg_tables 
WHERE schemaname = 'public';

