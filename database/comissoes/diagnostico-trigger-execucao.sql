-- =====================================================
-- DIAGNÓSTICO: POR QUE O TRIGGER NÃO ESTÁ EXECUTANDO?
-- =====================================================

-- 1. VERIFICAR SE EXISTEM COMISSÕES PARA ESSAS O.S.
-- =====================================================
SELECT 
    os.id as os_id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.tecnico_id,
    CASE 
        WHEN ch.id IS NOT NULL THEN '✅ JÁ TEM COMISSÃO'
        ELSE '❌ SEM COMISSÃO'
    END as status_comissao,
    ch.id as comissao_id,
    ch.valor_comissao
FROM ordens_servico os
LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
WHERE os.numero_os IN (7, 47, 1312, 46, 1308, 1311, 1310, 1305, 1307, 1306)
ORDER BY os.numero_os DESC;

-- 2. VERIFICAR O CÓDIGO ATUAL DO TRIGGER WHEN
-- =====================================================
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_registrar_comissao';

-- 3. VERIFICAR SE O TRIGGER ESTÁ ATIVO
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

-- 4. VERIFICAR A FUNÇÃO ATUAL
-- =====================================================
SELECT 
    proname as nome_funcao,
    CASE 
        WHEN prosrc LIKE '%UPPER%status%' THEN '✅ Usa UPPER (case-insensitive)'
        WHEN prosrc LIKE '%status_normalizado%' THEN '✅ Usa variável normalizada'
        ELSE '⚠️ Pode ter problema de case'
    END as verificacao_case,
    CASE 
        WHEN prosrc LIKE '%comissao_ativa%' THEN '✅ Verifica comissao_ativa'
        ELSE '❌ NÃO verifica comissao_ativa'
    END as verificacao_comissao_ativa
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 5. TESTAR AS CONDIÇÕES DO WHEN DO TRIGGER PARA UMA O.S. ESPECÍFICA
-- =====================================================
SELECT 
    id,
    numero_os,
    status,
    status_tecnico,
    data_entrega,
    tecnico_id,
    -- Testar a condição do WHEN do trigger
    (
        (UPPER(TRIM(COALESCE(status, ''))) = 'ENTREGUE' 
         OR UPPER(TRIM(COALESCE(status, ''))) = 'FINALIZADA'
         OR UPPER(TRIM(COALESCE(status_tecnico, ''))) = 'FINALIZADA')
        AND data_entrega IS NOT NULL
        AND tecnico_id IS NOT NULL
    ) as condicao_when_atende,
    -- Testar a condição antiga (sem UPPER)
    (
        (status = 'ENTREGUE' OR status = 'FINALIZADA' OR status_tecnico = 'FINALIZADA')
        AND data_entrega IS NOT NULL
        AND tecnico_id IS NOT NULL
    ) as condicao_when_antiga_atende
FROM ordens_servico
WHERE numero_os = 7; -- Uma das O.S. que deveria ter comissão

-- 6. VERIFICAR SE HOUVE MUDANÇA DE STATUS (OLD vs NEW)
-- =====================================================
-- Esta query simula o que o trigger verifica
-- Se a O.S. já estava como ENTREGUE/FINALIZADA antes da última atualização,
-- o trigger pode não executar
SELECT 
    os.id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.updated_at,
    -- Verificar histórico de mudanças de status
    sh.status_anterior,
    sh.status_novo,
    sh.status_tecnico_anterior,
    sh.status_tecnico_novo,
    sh.created_at as mudanca_em
FROM ordens_servico os
LEFT JOIN status_historico sh ON sh.os_id = os.id
WHERE os.numero_os IN (7, 47, 1312)
ORDER BY sh.created_at DESC;
