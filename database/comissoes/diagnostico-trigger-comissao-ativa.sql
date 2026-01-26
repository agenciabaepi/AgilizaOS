-- =====================================================
-- DIAGNÓSTICO: VERIFICAR SE O TRIGGER ESTÁ VERIFICANDO comissao_ativa
-- =====================================================
-- Execute este script para verificar se o trigger atual verifica comissao_ativa

-- 1. VERIFICAR A FUNÇÃO ATUAL DO TRIGGER
-- =====================================================
SELECT 
    proname as nome_funcao,
    prosrc as codigo_funcao
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 2. VERIFICAR SE A FUNÇÃO TEM VERIFICAÇÃO DE comissao_ativa
-- =====================================================
-- Procura pela verificação de comissao_ativa no código da função
SELECT 
    CASE 
        WHEN prosrc LIKE '%comissao_ativa%' THEN '✅ VERIFICA comissao_ativa'
        ELSE '❌ NÃO VERIFICA comissao_ativa'
    END as status_verificacao,
    proname as nome_funcao
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 3. VERIFICAR TÉCNICOS E SUAS CONFIGURAÇÕES DE COMISSÃO
-- =====================================================
SELECT 
    u.id,
    u.nome,
    u.nivel,
    u.comissao_ativa,
    u.tipo_comissao,
    u.comissao_percentual,
    u.comissao_fixa,
    COUNT(ch.id) as total_comissoes_registradas
FROM usuarios u
LEFT JOIN comissoes_historico ch ON ch.tecnico_id = u.id
WHERE u.nivel = 'tecnico'
GROUP BY u.id, u.nome, u.nivel, u.comissao_ativa, u.tipo_comissao, u.comissao_percentual, u.comissao_fixa
ORDER BY u.nome;

-- 4. VERIFICAR COMISSÕES RECENTES E STATUS DOS TÉCNICOS
-- =====================================================
SELECT 
    ch.id as comissao_id,
    ch.ordem_servico_id,
    ch.data_entrega,
    ch.valor_comissao,
    ch.status as status_comissao,
    ch.ativa as comissao_ativa,
    u.nome as tecnico_nome,
    u.comissao_ativa as tecnico_comissao_ativa_atual,
    CASE 
        WHEN u.comissao_ativa = false THEN '⚠️ Técnico DESATIVADO - Comissão não deveria ter sido registrada'
        WHEN u.comissao_ativa = true THEN '✅ Técnico ATIVO - OK'
        ELSE '❓ Status desconhecido'
    END as diagnostico
FROM comissoes_historico ch
INNER JOIN usuarios u ON u.id = ch.tecnico_id
ORDER BY ch.data_entrega DESC, ch.created_at DESC
LIMIT 20;

-- 5. VERIFICAR SE O TRIGGER ESTÁ ATIVO
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_registrar_comissao';
