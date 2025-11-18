-- =====================================================
-- VERIFICAR LOGS DO TRIGGER
-- =====================================================
-- Execute este script APÓS finalizar uma OS para ver os logs

-- 1. VERIFICAR ÚLTIMA OS ATUALIZADA
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
        WHEN (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
             AND os.data_entrega IS NOT NULL
             AND os.tecnico_id IS NOT NULL
        THEN '✅ DEVE DISPARAR TRIGGER'
        ELSE '❌ NÃO DEVE DISPARAR'
    END as deve_disparar
FROM ordens_servico os
ORDER BY os.updated_at DESC
LIMIT 1;

-- 2. VERIFICAR SE TEM COMISSÃO PARA ESSA OS
-- =====================================================
SELECT 
    ch.*,
    os.numero_os
FROM comissoes_historico ch
JOIN ordens_servico os ON ch.ordem_servico_id = os.id
WHERE os.updated_at >= NOW() - INTERVAL '5 minutes'
ORDER BY ch.created_at DESC
LIMIT 5;

-- 3. VERIFICAR SE O TRIGGER ESTÁ ATIVO
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_registrar_comissao';

-- NOTA: Os logs do RAISE WARNING aparecem nos logs do PostgreSQL
-- No Supabase, você pode verificar em: Database > Logs > Postgres Logs

