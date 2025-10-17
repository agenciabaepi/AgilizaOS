-- =====================================================
-- VERIFICAÇÃO FINAL - STATUS RLS DE TODAS AS TABELAS
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

-- 3. VERIFICAR VIEWS (sempre sem RLS - normal)
-- =====================================================
SELECT 
    schemaname, 
    viewname as "Nome da View",
    'N/A (Views não têm RLS)' as "RLS Status",
    '✅ NORMAL' as "Status"
FROM pg_views 
WHERE schemaname = 'public' 
ORDER BY viewname;

-- 4. RESUMO FINAL
-- =====================================================
-- Se todas as tabelas aparecem com "✅ CORRIGIDA", então:
-- 1. Todas as tabelas têm RLS habilitado
-- 2. As views herdam segurança das tabelas automaticamente
-- 3. Os avisos "Unrestricted" do Supabase devem desaparecer
-- 4. A segurança do banco está garantida





