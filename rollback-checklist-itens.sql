-- =====================================================
-- ROLLBACK - CHECKLIST_ITENS
-- =====================================================
-- Este script reverte as mudanças de RLS na tabela checklist_itens
-- porque quebrou a funcionalidade

-- 1. REMOVER POLÍTICAS
-- =====================================================
DROP POLICY IF EXISTS "checklist_itens_select_policy" ON public.checklist_itens;
DROP POLICY IF EXISTS "checklist_itens_insert_policy" ON public.checklist_itens;
DROP POLICY IF EXISTS "checklist_itens_update_policy" ON public.checklist_itens;
DROP POLICY IF EXISTS "checklist_itens_delete_policy" ON public.checklist_itens;

-- 2. DESABILITAR RLS
-- =====================================================
ALTER TABLE public.checklist_itens DISABLE ROW LEVEL SECURITY;

-- 3. VERIFICAR SE FOI REVERTIDO
-- =====================================================
-- Execute para confirmar:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'checklist_itens';
-- Deve retornar rowsecurity = false

-- =====================================================
-- PRÓXIMOS PASSOS:
-- 1. Execute este rollback primeiro
-- 2. Teste se o checklist voltou a funcionar
-- 3. Depois podemos criar uma política mais específica
--    que não quebre a funcionalidade
-- =====================================================
