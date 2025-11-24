-- =====================================================
-- TESTE: DESABILITAR RLS TEMPORARIAMENTE
-- =====================================================
-- Execute este script APENAS PARA TESTAR se o problema é RLS
-- Depois execute recriar_rls_tickets.sql para reabilitar com políticas corretas

-- Desabilitar RLS temporariamente (APENAS PARA TESTE)
ALTER TABLE tickets_suporte DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios DISABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Após testar, execute recriar_rls_tickets.sql
-- para reabilitar o RLS com as políticas corretas!

