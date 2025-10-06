-- =====================================================
-- VERIFICAR SE RLS FOI DESABILITADO
-- =====================================================

-- 1. VERIFICAR STATUS RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA ATIVO'
        ELSE '✅ RLS DESABILITADO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('usuarios', 'empresas', 'clientes', 'ordens_servico', 'status_historico', 'equipamentos_tipos')
ORDER BY tablename;

-- 2. VERIFICAR POLÍTICAS RESTANTES
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('usuarios', 'empresas', 'clientes', 'ordens_servico', 'status_historico', 'equipamentos_tipos')
ORDER BY tablename, policyname;

-- 3. TESTAR SELECT DIRETO NA OS #124
SELECT 
    id,
    numero_os,
    status,
    status_tecnico,
    equipamento,
    empresa_id
FROM public.ordens_servico 
WHERE numero_os = '124';

-- 4. TESTAR UPDATE DIRETO
UPDATE public.ordens_servico 
SET status_tecnico = 'teste_update_direto'
WHERE numero_os = '124';

-- Verificar se o update funcionou
SELECT 
    numero_os,
    status_tecnico
FROM public.ordens_servico 
WHERE numero_os = '124';

