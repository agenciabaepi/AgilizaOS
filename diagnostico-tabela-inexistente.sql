-- =====================================================
-- DIAGNÓSTICO: TABELA ordens_servico NÃO EXISTE
-- =====================================================

-- ✅ 1. VERIFICAR SE A TABELA EXISTE
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'ordens_servico'
AND table_schema = 'public';

-- ✅ 2. LISTAR TODAS AS TABELAS QUE CONTÊM "ordens"
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name LIKE '%ordens%'
AND table_schema = 'public';

-- ✅ 3. LISTAR TODAS AS TABELAS QUE CONTÊM "servico"
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name LIKE '%servico%'
AND table_schema = 'public';

-- ✅ 4. VERIFICAR SE EXISTE ALGUMA TABELA SIMILAR
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name LIKE '%os%'
AND table_schema = 'public';

-- ✅ 5. LISTAR TODAS AS TABELAS DO SCHEMA PUBLIC
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ✅ 6. VERIFICAR PERMISSÕES DO USUÁRIO ATUAL
SELECT 
    current_user,
    session_user,
    current_database();

-- ✅ 7. VERIFICAR SE ESTAMOS NO SCHEMA CORRETO
SELECT current_schema();





