-- =====================================================
-- VERIFICAR TÉCNICOS DAS O.S. FINALIZADAS
-- =====================================================
-- Este script verifica se os técnicos das O.S. existem e são válidos

-- 1. VERIFICAR TODAS AS O.S. FINALIZADAS E SEUS TÉCNICOS
-- =====================================================
SELECT 
    os.id as os_id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.tecnico_id,
    os.valor_faturado,
    -- Verificar se técnico existe
    CASE 
        WHEN u.id IS NULL THEN '❌ TÉCNICO NÃO EXISTE'
        WHEN u.nivel != 'tecnico' THEN '❌ NÃO É TÉCNICO (nível: ' || u.nivel || ')'
        WHEN u.comissao_ativa = false THEN '❌ COMISSÃO DESATIVADA'
        ELSE '✅ TÉCNICO VÁLIDO'
    END as status_tecnico_validacao,
    u.id as tecnico_id_encontrado,
    u.nome as tecnico_nome,
    u.nivel as tecnico_nivel,
    u.comissao_ativa,
    u.tipo_comissao,
    u.comissao_percentual,
    u.comissao_fixa,
    -- Verificar se já tem comissão
    CASE 
        WHEN ch.id IS NOT NULL THEN '✅ JÁ TEM COMISSÃO'
        ELSE '❌ SEM COMISSÃO'
    END as status_comissao,
    ch.id as comissao_id
FROM ordens_servico os
LEFT JOIN usuarios u ON u.id = os.tecnico_id
LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
WHERE (
    UPPER(TRIM(COALESCE(os.status, ''))) = 'ENTREGUE' 
    OR UPPER(TRIM(COALESCE(os.status, ''))) = 'FINALIZADA'
    OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) = 'FINALIZADA'
)
AND os.data_entrega IS NOT NULL
AND os.tecnico_id IS NOT NULL
ORDER BY os.numero_os DESC
LIMIT 20;

-- 2. CONTAR OS PROBLEMAS
-- =====================================================
SELECT 
    COUNT(*) FILTER (WHERE u.id IS NULL) as tecnicos_nao_existem,
    COUNT(*) FILTER (WHERE u.id IS NOT NULL AND u.nivel != 'tecnico') as nao_sao_tecnicos,
    COUNT(*) FILTER (WHERE u.id IS NOT NULL AND u.nivel = 'tecnico' AND u.comissao_ativa = false) as comissao_desativada,
    COUNT(*) FILTER (WHERE u.id IS NOT NULL AND u.nivel = 'tecnico' AND COALESCE(u.comissao_ativa, true) = true) as tecnicos_validos,
    COUNT(*) FILTER (WHERE ch.id IS NOT NULL) as ja_tem_comissao,
    COUNT(*) FILTER (WHERE ch.id IS NULL AND u.id IS NOT NULL AND u.nivel = 'tecnico' AND COALESCE(u.comissao_ativa, true) = true) as precisam_comissao
FROM ordens_servico os
LEFT JOIN usuarios u ON u.id = os.tecnico_id
LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
WHERE (
    UPPER(TRIM(COALESCE(os.status, ''))) = 'ENTREGUE' 
    OR UPPER(TRIM(COALESCE(os.status, ''))) = 'FINALIZADA'
    OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) = 'FINALIZADA'
)
AND os.data_entrega IS NOT NULL
AND os.tecnico_id IS NOT NULL;

-- 3. VERIFICAR ESPECIFICAMENTE A OS #7
-- =====================================================
SELECT 
    os.id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.tecnico_id as tecnico_id_na_os,
    os.valor_faturado,
    u.id as tecnico_id_encontrado,
    u.nome as tecnico_nome,
    u.nivel as tecnico_nivel,
    u.comissao_ativa,
    CASE 
        WHEN u.id IS NULL THEN '❌ TÉCNICO NÃO EXISTE na tabela usuarios'
        WHEN u.nivel != 'tecnico' THEN '❌ NÃO É TÉCNICO - Nível: ' || u.nivel
        WHEN u.comissao_ativa = false THEN '❌ COMISSÃO DESATIVADA'
        ELSE '✅ TÉCNICO VÁLIDO - Pode receber comissão'
    END as diagnostico
FROM ordens_servico os
LEFT JOIN usuarios u ON u.id = os.tecnico_id
WHERE os.numero_os = 7;
