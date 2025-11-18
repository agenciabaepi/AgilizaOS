-- =====================================================
-- TESTAR TRIGGER DE COMISSÕES
-- =====================================================
-- Este script ajuda a testar se o trigger está funcionando

-- 1. VERIFICAR ULTIMA OS FINALIZADA (para testar)
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
    END as tecnico_check,
    CASE 
        WHEN (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
             AND os.data_entrega IS NOT NULL
             AND os.tecnico_id IS NOT NULL
        THEN '✅ DEVE GERAR COMISSÃO'
        ELSE '❌ NÃO gera comissão'
    END as deve_gerar
FROM ordens_servico os
ORDER BY os.updated_at DESC
LIMIT 5;

-- 2. VERIFICAR SE JÁ EXISTE COMISSÃO PARA ESSAS OSs
-- =====================================================
SELECT 
    ch.id as comissao_id,
    ch.ordem_servico_id,
    ch.status as status_comissao,
    ch.valor_comissao,
    ch.tipo_comissao,
    ch.created_at as comissao_criada_em,
    os.numero_os,
    os.status as status_os,
    os.status_tecnico,
    os.updated_at as os_atualizada_em
FROM comissoes_historico ch
JOIN ordens_servico os ON ch.ordem_servico_id = os.id
ORDER BY ch.created_at DESC
LIMIT 10;

-- 3. VERIFICAR OSs QUE DEVERIAM TER COMISSÃO MAS NÃO TÊM
-- =====================================================
SELECT 
    os.id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.tecnico_id,
    os.updated_at,
    CASE 
        WHEN ch.id IS NOT NULL THEN '✅ TEM comissão'
        ELSE '❌ NÃO TEM comissão'
    END as tem_comissao
FROM ordens_servico os
LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
WHERE (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
AND os.data_entrega IS NOT NULL
AND os.tecnico_id IS NOT NULL
ORDER BY os.updated_at DESC
LIMIT 10;

-- 4. TESTAR MANUALMENTE: Simular atualização de uma OS
-- =====================================================
-- ATENÇÃO: Substitua 'OS_ID_AQUI' pelo ID de uma OS que você acabou de finalizar
-- Este teste vai forçar o trigger a executar
DO $$
DECLARE
    os_id_test UUID := 'OS_ID_AQUI'::uuid;  -- SUBSTITUIR
    os_record RECORD;
    comissao_count INTEGER;
BEGIN
    -- Buscar a OS
    SELECT * INTO os_record
    FROM ordens_servico
    WHERE id = os_id_test;
    
    IF os_record.id IS NULL THEN
        RAISE NOTICE '❌ OS não encontrada';
        RETURN;
    END IF;
    
    RAISE NOTICE '📋 OS encontrada: %', os_record.numero_os;
    RAISE NOTICE '   Status: %', os_record.status;
    RAISE NOTICE '   Status Técnico: %', os_record.status_tecnico;
    RAISE NOTICE '   Data Entrega: %', os_record.data_entrega;
    RAISE NOTICE '   Técnico ID: %', os_record.tecnico_id;
    
    -- Verificar se já tem comissão
    SELECT COUNT(*) INTO comissao_count
    FROM comissoes_historico
    WHERE ordem_servico_id = os_id_test;
    
    RAISE NOTICE '   Comissões existentes: %', comissao_count;
    
    -- Verificar critérios
    IF (os_record.status = 'ENTREGUE' OR os_record.status_tecnico = 'FINALIZADA')
       AND os_record.data_entrega IS NOT NULL
       AND os_record.tecnico_id IS NOT NULL THEN
        RAISE NOTICE '✅ OS atende todos os critérios';
        
        IF comissao_count = 0 THEN
            RAISE NOTICE '⚠️ Mas não tem comissão registrada!';
            RAISE NOTICE '   O trigger pode não estar funcionando ou a OS não foi atualizada após criar o trigger.';
        ELSE
            RAISE NOTICE '✅ Comissão já está registrada';
        END IF;
    ELSE
        RAISE NOTICE '❌ OS NÃO atende os critérios';
    END IF;
END $$;

