-- =====================================================
-- VERIFICAR TABELAS DE COMISSÃO
-- =====================================================
-- Este script verifica quais tabelas relacionadas a comissão existem

-- 1. LISTAR TODAS AS TABELAS QUE CONTÊM "comissao"
-- =====================================================
SELECT 
    schemaname, 
    tablename, 
    rowsecurity
FROM pg_tables 
WHERE tablename LIKE '%comissao%' 
   OR tablename LIKE '%comissoes%'
   OR tablename LIKE '%commission%'
ORDER BY tablename;

-- 2. LISTAR TODAS AS TABELAS QUE CONTÊM "configuracao"
-- =====================================================
SELECT 
    schemaname, 
    tablename, 
    rowsecurity
FROM pg_tables 
WHERE tablename LIKE '%configuracao%'
   OR tablename LIKE '%configuracoes%'
   OR tablename LIKE '%config%'
ORDER BY tablename;

-- 3. LISTAR TODAS AS TABELAS PÚBLICAS (para referência)
-- =====================================================
-- SELECT 
--     schemaname, 
--     tablename, 
--     rowsecurity
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
