-- =====================================================
-- CORREÇÃO DUPLICATE_INDEX - REMOÇÃO DE ÍNDICES REDUNDANTES
-- =====================================================
-- Este script corrige os avisos de segurança "duplicate_index"
-- removendo índices duplicados que são redundantes e impactam a performance.

-- =====================================================
-- ÍNDICES DUPLICADOS IDENTIFICADOS
-- =====================================================

-- 1. PRODUTOS_SERVICOS - ÍNDICES DUPLICADOS PARA CATEGORIA, GRUPO, SUBCATEGORIA
-- =====================================================

-- Verificar índices existentes na tabela produtos_servicos
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'produtos_servicos' 
-- AND schemaname = 'public'
-- ORDER BY indexname;

-- Remover índices duplicados (manter apenas um de cada tipo)
-- Nota: Execute com cuidado - verifique primeiro quais índices existem

-- Exemplo de remoção de índices duplicados (ajuste conforme necessário):
-- DROP INDEX IF EXISTS public.idx_produtos_servicos_categoria_duplicate;
-- DROP INDEX IF EXISTS public.idx_produtos_servicos_grupo_duplicate;
-- DROP INDEX IF EXISTS public.idx_produtos_servicos_subcategoria_duplicate;

-- 2. WHATSAPP_SESSIONS - ÍNDICES DUPLICADOS PARA EMPRESA_ID
-- =====================================================

-- Verificar índices existentes na tabela whatsapp_sessions
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'whatsapp_sessions' 
-- AND schemaname = 'public'
-- ORDER BY indexname;

-- Remover índices duplicados para empresa_id
-- Nota: Execute com cuidado - verifique primeiro quais índices existem

-- Exemplo de remoção de índices duplicados (ajuste conforme necessário):
-- DROP INDEX IF EXISTS public.idx_whatsapp_sessions_empresa_id_duplicate;

-- =====================================================
-- SCRIPT DE VERIFICAÇÃO E LIMPEZA AUTOMÁTICA
-- =====================================================

-- Função para identificar índices duplicados
CREATE OR REPLACE FUNCTION find_duplicate_indexes()
RETURNS TABLE (
    table_name text,
    column_names text,
    index_count bigint,
    index_names text[]
) AS $$
BEGIN
    RETURN QUERY
    WITH index_columns AS (
        SELECT 
            t.relname as table_name,
            array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as column_names,
            array_agg(i.relname ORDER BY i.relname) as index_names
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r'
        AND t.relname IN ('produtos_servicos', 'whatsapp_sessions')
        AND i.relkind = 'i'
        AND NOT ix.indisprimary
        AND NOT ix.indisunique
        GROUP BY t.relname, ix.indrelid
    )
    SELECT 
        ic.table_name,
        array_to_string(ic.column_names, ', ') as column_names,
        count(*) as index_count,
        ic.index_names
    FROM index_columns ic
    GROUP BY ic.table_name, ic.column_names, ic.index_names
    HAVING count(*) > 1
    ORDER BY ic.table_name, ic.column_names;
END;
$$ LANGUAGE plpgsql;

-- Executar a função para identificar duplicatas
-- SELECT * FROM find_duplicate_indexes();

-- =====================================================
-- SCRIPT DE LIMPEZA ESPECÍFICO PARA PRODUTOS_SERVICOS
-- =====================================================

-- Verificar índices existentes em produtos_servicos
-- SELECT 
--     i.relname as index_name,
--     array_to_string(array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)), ', ') as columns,
--     ix.indisunique,
--     ix.indisprimary
-- FROM pg_class t
-- JOIN pg_index ix ON t.oid = ix.indrelid
-- JOIN pg_class i ON i.oid = ix.indexrelid
-- JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
-- WHERE t.relname = 'produtos_servicos'
-- AND t.relkind = 'r'
-- GROUP BY i.relname, ix.indisunique, ix.indisprimary
-- ORDER BY columns;

-- Remover índices duplicados baseado na verificação acima
-- Exemplo (ajuste conforme a saída da verificação):
-- DROP INDEX IF EXISTS public.idx_produtos_servicos_categoria_old;
-- DROP INDEX IF EXISTS public.idx_produtos_servicos_grupo_old;
-- DROP INDEX IF EXISTS public.idx_produtos_servicos_subcategoria_old;

-- =====================================================
-- SCRIPT DE LIMPEZA ESPECÍFICO PARA WHATSAPP_SESSIONS
-- =====================================================

-- Verificar índices existentes em whatsapp_sessions
-- SELECT 
--     i.relname as index_name,
--     array_to_string(array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)), ', ') as columns,
--     ix.indisunique,
--     ix.indisprimary
-- FROM pg_class t
-- JOIN pg_index ix ON t.oid = ix.indrelid
-- JOIN pg_class i ON i.oid = ix.indexrelid
-- JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
-- WHERE t.relname = 'whatsapp_sessions'
-- AND t.relkind = 'r'
-- GROUP BY i.relname, ix.indisunique, ix.indisprimary
-- ORDER BY columns;

-- Remover índices duplicados baseado na verificação acima
-- Exemplo (ajuste conforme a saída da verificação):
-- DROP INDEX IF EXISTS public.idx_whatsapp_sessions_empresa_id_old;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se ainda existem índices duplicados:
-- SELECT * FROM find_duplicate_indexes();

-- Verificar total de índices por tabela:
-- SELECT 
--     tablename,
--     count(*) as index_count
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('produtos_servicos', 'whatsapp_sessions')
-- GROUP BY tablename
-- ORDER BY tablename;

-- Limpar a função auxiliar
-- DROP FUNCTION IF EXISTS find_duplicate_indexes();

-- =====================================================
-- INSTRUÇÕES DE EXECUÇÃO
-- =====================================================
-- 1. Execute primeiro as queries de verificação para ver os índices existentes
-- 2. Identifique quais são duplicados
-- 3. Ajuste os comandos DROP INDEX conforme necessário
-- 4. Execute os comandos DROP INDEX um por vez
-- 5. Execute a verificação final para confirmar que os duplicados foram removidos

-- =====================================================
-- STATUS DAS CORREÇÕES:
-- ✅ function_search_path_mutable - CORRIGIDO
-- ✅ auth_rls_initplan - CORRIGIDO
-- ✅ multiple_permissive_policies - CORRIGIDO
-- 🔄 duplicate_index - EM ANDAMENTO

