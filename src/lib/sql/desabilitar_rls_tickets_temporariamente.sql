-- =====================================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA TICKETS
-- =====================================================
-- Execute este script se o RLS estiver causando problemas
-- e você precisar que os tickets funcionem enquanto investigamos

ALTER TABLE tickets_suporte DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios DISABLE ROW LEVEL SECURITY;

-- Verificar se foi desabilitado
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO'
        ELSE 'RLS DESABILITADO ✅'
    END as status
FROM pg_tables 
WHERE tablename IN ('tickets_suporte', 'tickets_comentarios');

