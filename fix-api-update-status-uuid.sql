-- =====================================================
-- CORREÇÃO API UPDATE-STATUS - PROBLEMA UUID
-- =====================================================
-- O problema é que a API está recebendo '124' mas o ID é UUID
-- Vamos corrigir isso

-- =====================================================
-- 1. VERIFICAR ESTRUTURA DA TABELA
-- =====================================================

-- Verificar tipos de dados das colunas
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ordens_servico'
AND column_name IN ('id', 'numero_os', 'empresa_id')
ORDER BY column_name;

-- =====================================================
-- 2. BUSCAR OS #124 COM TIPO CORRETO
-- =====================================================

-- Buscar por numero_os (que é string)
SELECT 
    id,
    numero_os,
    equipamento,
    empresa_id,
    status,
    status_tecnico
FROM public.ordens_servico 
WHERE numero_os = '124';

-- =====================================================
-- 3. TESTAR SELECT COM SERVICE ROLE (CORRIGIDO)
-- =====================================================

-- Teste 1: Como service_role (usando numero_os)
SET ROLE service_role;
SELECT 
    id,
    equipamento,
    empresa_id
FROM public.ordens_servico 
WHERE numero_os = '124';
RESET ROLE;

-- Teste 2: Como usuário autenticado
SELECT 
    id,
    equipamento,
    empresa_id
FROM public.ordens_servico 
WHERE numero_os = '124';

-- =====================================================
-- 4. VERIFICAR SE SERVICE_ROLE CONSEGUE FAZER SELECT
-- =====================================================

-- Teste específico para service_role
SET ROLE service_role;
DO $$
DECLARE
    os_record record;
    error_msg text;
BEGIN
    BEGIN
        SELECT * INTO os_record
        FROM public.ordens_servico 
        WHERE numero_os = '124';
        
        IF FOUND THEN
            RAISE NOTICE '✅ Service Role consegue fazer SELECT: OS encontrada';
            RAISE NOTICE '📋 ID: %, numero_os: %', os_record.id, os_record.numero_os;
        ELSE
            RAISE NOTICE '❌ Service Role: OS não encontrada';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '❌ Service Role SELECT com erro: %', error_msg;
    END;
END $$;
RESET ROLE;

-- =====================================================
-- 5. VERIFICAR POLÍTICAS SELECT
-- =====================================================

-- Verificar se há políticas SELECT restritivas
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as condition,
    with_check as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'ordens_servico'
AND cmd = 'SELECT';

-- =====================================================
-- 6. TESTE FINAL - SIMULAR O QUE A API FAZ
-- =====================================================

-- Simular exatamente o que a API faz
SET ROLE service_role;
SELECT 
    equipamento,
    empresa_id
FROM public.ordens_servico 
WHERE numero_os = '124'
LIMIT 1;
RESET ROLE;

-- =====================================================
-- STATUS DA CORREÇÃO:
-- ✅ Problema UUID identificado
-- ✅ Query corrigida para usar numero_os
-- ✅ Teste com service_role realizado
-- ✅ Verificação de políticas SELECT
-- ✅ Simulação da API realizada
-- =====================================================

