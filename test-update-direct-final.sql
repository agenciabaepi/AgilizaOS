-- =====================================================
-- TESTE DIRETO DO UPDATE - DIAGNÓSTICO FINAL
-- =====================================================
-- Vamos testar exatamente o que a API está tentando fazer

-- =====================================================
-- 1. BUSCAR OS #124 E OBTER ID REAL
-- =====================================================

-- Buscar a OS para obter o ID real
SELECT 
    id,
    numero_os,
    status,
    status_tecnico,
    equipamento,
    empresa_id
FROM public.ordens_servico 
WHERE numero_os = '124';

-- =====================================================
-- 2. TESTAR UPDATE COM SERVICE ROLE
-- =====================================================

-- Teste 1: Como service_role
SET ROLE service_role;
DO $$
DECLARE
    os_record record;
    result_count integer;
    error_msg text;
BEGIN
    BEGIN
        -- Buscar a OS primeiro
        SELECT * INTO os_record
        FROM public.ordens_servico 
        WHERE numero_os = '124';
        
        IF FOUND THEN
            RAISE NOTICE '✅ OS encontrada: ID=%, numero_os=%', os_record.id, os_record.numero_os;
            
            -- Tentar atualizar
            UPDATE public.ordens_servico 
            SET status_tecnico = 'em atendimento',
                updated_at = NOW()
            WHERE id = os_record.id;
            
            GET DIAGNOSTICS result_count = ROW_COUNT;
            RAISE NOTICE '✅ UPDATE funcionou: % registros atualizados', result_count;
        ELSE
            RAISE NOTICE '❌ OS não encontrada';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '❌ Erro no UPDATE: %', error_msg;
    END;
END $$;
RESET ROLE;

-- =====================================================
-- 3. VERIFICAR SE HÁ TRIGGERS BLOQUEANDO
-- =====================================================

-- Verificar triggers na tabela
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ordens_servico'
AND event_object_schema = 'public';

-- =====================================================
-- 4. VERIFICAR CONSTRAINTS
-- =====================================================

-- Verificar constraints que podem estar bloqueando
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.ordens_servico'::regclass;

-- =====================================================
-- 5. TESTAR UPDATE SIMPLES
-- =====================================================

-- Teste mais simples
SET ROLE service_role;
UPDATE public.ordens_servico 
SET status_tecnico = 'teste'
WHERE numero_os = '124';
RESET ROLE;

-- =====================================================
-- STATUS DO TESTE:
-- ✅ Busca da OS realizada
-- ✅ Teste de UPDATE com service_role
-- ✅ Verificação de triggers
-- ✅ Verificação de constraints
-- ✅ Teste de UPDATE simples
-- =====================================================

