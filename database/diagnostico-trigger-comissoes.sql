-- =====================================================
-- DIAGNÓSTICO: Por que o trigger não está registrando comissões?
-- =====================================================

-- 1. VERIFICAR SE O TRIGGER EXISTE
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_registrar_comissao'
OR event_object_table = 'ordens_servico';

-- 2. VERIFICAR SE A FUNÇÃO EXISTE
-- =====================================================
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. VERIFICAR ULTIMA OS FINALIZADA (para testar)
-- =====================================================
SELECT 
    os.id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.tecnico_id,
    os.empresa_id,
    os.cliente_id,
    os.valor_faturado,
    CASE 
        WHEN os.status = 'ENTREGUE' THEN '✅ Status = ENTREGUE'
        WHEN os.status_tecnico = 'FINALIZADA' THEN '✅ Status Técnico = FINALIZADA'
        ELSE '❌ Status não atende'
    END as status_check,
    CASE 
        WHEN os.data_entrega IS NOT NULL THEN '✅ Tem data_entrega'
        ELSE '❌ Sem data_entrega'
    END as data_check,
    CASE 
        WHEN os.tecnico_id IS NOT NULL THEN '✅ Tem técnico'
        ELSE '❌ Sem técnico'
    END as tecnico_check
FROM ordens_servico os
WHERE (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
AND os.data_entrega IS NOT NULL
ORDER BY os.updated_at DESC
LIMIT 5;

-- 4. VERIFICAR SE JÁ EXISTE COMISSÃO PARA ESSAS OSs
-- =====================================================
SELECT 
    ch.id,
    ch.ordem_servico_id,
    ch.status,
    ch.created_at,
    os.numero_os
FROM comissoes_historico ch
JOIN ordens_servico os ON ch.ordem_servico_id = os.id
WHERE (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
AND os.data_entrega IS NOT NULL
ORDER BY ch.created_at DESC
LIMIT 5;

-- 5. TESTAR A FUNÇÃO MANUALMENTE (substitua o UUID pela OS que você acabou de finalizar)
-- =====================================================
-- Substitua 'OS_ID_AQUI' pelo ID da OS que você acabou de finalizar
DO $$
DECLARE
    os_record RECORD;
BEGIN
    SELECT * INTO os_record
    FROM ordens_servico
    WHERE id = 'OS_ID_AQUI'::uuid  -- SUBSTITUIR
    LIMIT 1;
    
    IF os_record.id IS NOT NULL THEN
        RAISE NOTICE 'OS encontrada: %', os_record.numero_os;
        RAISE NOTICE 'Status: %', os_record.status;
        RAISE NOTICE 'Status Técnico: %', os_record.status_tecnico;
        RAISE NOTICE 'Data Entrega: %', os_record.data_entrega;
        RAISE NOTICE 'Técnico ID: %', os_record.tecnico_id;
        
        -- Verificar se atende os critérios
        IF (os_record.status = 'ENTREGUE' OR os_record.status_tecnico = 'FINALIZADA')
           AND os_record.data_entrega IS NOT NULL
           AND os_record.tecnico_id IS NOT NULL THEN
            RAISE NOTICE '✅ OS atende todos os critérios para gerar comissão';
        ELSE
            RAISE NOTICE '❌ OS NÃO atende os critérios';
        END IF;
    ELSE
        RAISE NOTICE '❌ OS não encontrada';
    END IF;
END $$;

