-- =====================================================
-- DIAGNÓSTICO COMPLETO: POR QUE COMISSÕES NÃO ESTÃO SENDO REGISTRADAS
-- =====================================================
-- Execute este script para identificar o problema

-- 1. VERIFICAR AS 3 O.S. FINALIZADAS RECENTES
-- =====================================================
SELECT 
    id,
    numero_os,
    status,
    status_tecnico,
    tecnico_id,
    data_entrega,
    valor_faturado,
    empresa_id,
    cliente_id,
    updated_at
FROM ordens_servico
WHERE status = 'finalizada' OR status_tecnico = 'FINALIZADA'
ORDER BY updated_at DESC
LIMIT 5;

-- 2. VERIFICAR SE ESSAS O.S. TÊM COMISSÕES REGISTRADAS
-- =====================================================
SELECT 
    ch.id as comissao_id,
    ch.ordem_servico_id,
    ch.tecnico_id,
    ch.valor_comissao,
    ch.status,
    ch.data_entrega,
    os.numero_os,
    os.status as os_status,
    os.status_tecnico as os_status_tecnico
FROM comissoes_historico ch
INNER JOIN ordens_servico os ON os.id = ch.ordem_servico_id
WHERE os.status = 'finalizada' OR os.status_tecnico = 'FINALIZADA'
ORDER BY ch.created_at DESC
LIMIT 10;

-- 3. VERIFICAR OS TÉCNICOS DAS O.S. FINALIZADAS
-- =====================================================
SELECT 
    os.id as os_id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.tecnico_id,
    os.data_entrega,
    os.valor_faturado,
    u.nome as tecnico_nome,
    u.comissao_ativa,
    u.tipo_comissao,
    u.comissao_percentual,
    u.comissao_fixa,
    CASE 
        WHEN os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA' THEN '✅ Status OK para trigger'
        ELSE '❌ Status não atende critério do trigger'
    END as status_trigger,
    CASE 
        WHEN os.data_entrega IS NOT NULL THEN '✅ data_entrega OK'
        ELSE '❌ data_entrega NULL - trigger não executa'
    END as data_entrega_check,
    CASE 
        WHEN os.tecnico_id IS NOT NULL THEN '✅ tecnico_id OK'
        ELSE '❌ tecnico_id NULL - trigger não executa'
    END as tecnico_id_check,
    CASE 
        WHEN u.comissao_ativa = true THEN '✅ Comissão ativa'
        WHEN u.comissao_ativa = false THEN '❌ Comissão DESATIVADA - trigger não registra'
        ELSE '⚠️ comissao_ativa NULL - será considerado true'
    END as comissao_ativa_check
FROM ordens_servico os
LEFT JOIN usuarios u ON u.id = os.tecnico_id
WHERE (os.status = 'finalizada' OR os.status_tecnico = 'FINALIZADA')
  AND os.data_entrega IS NOT NULL
ORDER BY os.updated_at DESC
LIMIT 5;

-- 4. VERIFICAR O CÓDIGO DA FUNÇÃO ATUAL
-- =====================================================
SELECT 
    proname as nome_funcao,
    prosrc as codigo_funcao
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 5. VERIFICAR SE O TRIGGER ESTÁ ATIVO
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_registrar_comissao';

-- 6. TESTAR AS CONDIÇÕES DO TRIGGER MANUALMENTE
-- =====================================================
-- Esta query simula as condições que o trigger verifica
SELECT 
    os.id,
    os.numero_os,
    (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA') as condicao_status,
    (os.data_entrega IS NOT NULL) as condicao_data_entrega,
    (os.tecnico_id IS NOT NULL) as condicao_tecnico_id,
    CASE 
        WHEN (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
             AND os.data_entrega IS NOT NULL
             AND os.tecnico_id IS NOT NULL
        THEN '✅ TODAS CONDIÇÕES ATENDIDAS - Trigger DEVERIA executar'
        ELSE '❌ Alguma condição NÃO atendida - Trigger NÃO executa'
    END as resultado_trigger
FROM ordens_servico os
WHERE (os.status = 'finalizada' OR os.status_tecnico = 'FINALIZADA')
ORDER BY os.updated_at DESC
LIMIT 5;

-- 7. VERIFICAR SE HÁ COMISSÕES JÁ REGISTRADAS PARA ESSAS O.S.
-- =====================================================
SELECT 
    os.numero_os,
    os.id as os_id,
    CASE 
        WHEN ch.id IS NOT NULL THEN '✅ Comissão JÁ EXISTE'
        ELSE '❌ Comissão NÃO EXISTE - deveria ter sido criada'
    END as status_comissao,
    ch.id as comissao_id,
    ch.valor_comissao,
    ch.created_at as comissao_criada_em
FROM ordens_servico os
LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
WHERE (os.status = 'finalizada' OR os.status_tecnico = 'FINALIZADA')
  AND os.data_entrega IS NOT NULL
ORDER BY os.updated_at DESC
LIMIT 10;

-- 8. VERIFICAR LOGS DE ERRO (se houver tabela de logs)
-- =====================================================
-- Se você tiver uma tabela de logs do PostgreSQL, verificar erros recentes
SELECT 
    log_time,
    error_severity,
    message
FROM postgres_logs
WHERE message LIKE '%comissao%' OR message LIKE '%registrar_comissao%'
ORDER BY log_time DESC
LIMIT 20;
