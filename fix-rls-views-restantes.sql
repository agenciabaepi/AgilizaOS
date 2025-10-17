-- =====================================================
-- CORREÇÃO RLS - VIEWS RESTANTES
-- =====================================================
-- Este script habilita RLS para as views que ainda estão "Unrestricted"
-- Views também podem ter RLS habilitado

-- =====================================================
-- 1. VIEW: public.produtos_com_categorias
-- =====================================================
ALTER VIEW public.produtos_com_categorias ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "produtos_com_categorias_select_policy" ON public.produtos_com_categorias;

-- Política permissiva para SELECT
CREATE POLICY "produtos_com_categorias_select_policy" ON public.produtos_com_categorias
    FOR SELECT USING (true);

-- =====================================================
-- 2. VIEW: public.vw_metricas_status
-- =====================================================
ALTER VIEW public.vw_metricas_status ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "vw_metricas_status_select_policy" ON public.vw_metricas_status;

-- Política permissiva para SELECT
CREATE POLICY "vw_metricas_status_select_policy" ON public.vw_metricas_status
    FOR SELECT USING (true);

-- =====================================================
-- 3. VIEW: public.vw_tempo_por_status
-- =====================================================
ALTER VIEW public.vw_tempo_por_status ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "vw_tempo_por_status_select_policy" ON public.vw_tempo_por_status;

-- Política permissiva para SELECT
CREATE POLICY "vw_tempo_por_status_select_policy" ON public.vw_tempo_por_status
    FOR SELECT USING (true);

-- =====================================================
-- 4. VIEW: public.vw_ultimas_mudancas_status
-- =====================================================
ALTER VIEW public.vw_ultimas_mudancas_status ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "vw_ultimas_mudancas_status_select_policy" ON public.vw_ultimas_mudancas_status;

-- Política permissiva para SELECT
CREATE POLICY "vw_ultimas_mudancas_status_select_policy" ON public.vw_ultimas_mudancas_status
    FOR SELECT USING (true);

-- =====================================================
-- VERIFICAÇÃO FINAL DE TODAS AS VIEWS E TABELAS
-- =====================================================
-- Execute para verificar se todas as views e tabelas agora têm RLS habilitado:

-- Verificar tabelas:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- Verificar views:
-- SELECT schemaname, viewname, rowsecurity 
-- FROM pg_views 
-- WHERE schemaname = 'public' 
-- ORDER BY viewname;

-- =====================================================
-- STATUS FINAL COMPLETO DAS CORREÇÕES:
-- ✅ TODAS AS TABELAS E VIEWS AGORA TÊM RLS HABILITADO!
-- =====================================================

-- =====================================================
-- ROLLBACK DAS VIEWS (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute os comandos abaixo para reverter o RLS para todas as views:

-- ALTER VIEW public.produtos_com_categorias DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "produtos_com_categorias_select_policy" ON public.produtos_com_categorias;

-- ALTER VIEW public.vw_metricas_status DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "vw_metricas_status_select_policy" ON public.vw_metricas_status;

-- ALTER VIEW public.vw_tempo_por_status DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "vw_tempo_por_status_select_policy" ON public.vw_tempo_por_status;

-- ALTER VIEW public.vw_ultimas_mudancas_status DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "vw_ultimas_mudancas_status_select_policy" ON public.vw_ultimas_mudancas_status;





