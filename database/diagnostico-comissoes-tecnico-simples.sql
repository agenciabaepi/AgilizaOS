-- =====================================================
-- DIAGNÓSTICO SIMPLIFICADO: Comissões do Técnico
-- =====================================================
-- Este script verifica se há OSs que deveriam gerar comissão
-- Execute cada query separadamente

-- 1. LISTAR TODOS OS TÉCNICOS E SUAS CONFIGURAÇÕES
-- =====================================================
SELECT 
    u.id,
    u.nome,
    u.auth_user_id,
    u.empresa_id,
    u.tipo_comissao,
    u.comissao_fixa,
    u.comissao_percentual,
    CASE 
        WHEN u.tipo_comissao = 'fixo' THEN 'Fixo: R$ ' || COALESCE(u.comissao_fixa::text, '0,00')
        WHEN u.tipo_comissao = 'porcentagem' THEN 'Porcentagem: ' || COALESCE(u.comissao_percentual::text, '0') || '%'
        ELSE 'Não configurado'
    END as configuracao_comissao
FROM usuarios u
WHERE u.nivel = 'tecnico'
ORDER BY u.nome;

-- 2. PARA UM TÉCNICO ESPECÍFICO: Verificar OSs que deveriam gerar comissão
-- =====================================================
-- Substitua 'TECNICO_ID_AQUI' pelo ID (UUID) do técnico que você quer verificar
-- Você pode pegar o ID da query anterior
SELECT 
    os.id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.valor_faturado,
    os.valor_servico,
    os.valor_peca,
    CASE 
        WHEN os.status = 'ENTREGUE' THEN '✅ Status OK'
        WHEN os.status_tecnico = 'FINALIZADA' THEN '✅ Status Técnico OK'
        ELSE '❌ Status não atende'
    END as status_check,
    CASE 
        WHEN os.data_entrega IS NOT NULL THEN '✅ Tem data'
        ELSE '❌ Sem data_entrega'
    END as data_check,
    CASE 
        WHEN (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA') 
             AND os.data_entrega IS NOT NULL 
        THEN '✅ DEVE GERAR COMISSÃO'
        ELSE '❌ NÃO gera comissão'
    END as deve_gerar_comissao
FROM ordens_servico os
WHERE os.tecnico_id = 'TECNICO_ID_AQUI'::uuid  -- SUBSTITUIR pelo ID do técnico
ORDER BY os.created_at DESC
LIMIT 20;

-- 3. CONTAR OSs POR STATUS PARA UM TÉCNICO
-- =====================================================
-- Substitua 'TECNICO_ID_AQUI' pelo ID do técnico
SELECT 
    COUNT(*) as total_os,
    COUNT(*) FILTER (WHERE os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA') as os_entregues_finalizadas,
    COUNT(*) FILTER (WHERE (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA') AND os.data_entrega IS NOT NULL) as os_com_comissao,
    COUNT(*) FILTER (WHERE (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA') AND os.data_entrega IS NULL) as os_sem_data_entrega
FROM ordens_servico os
WHERE os.tecnico_id = 'TECNICO_ID_AQUI'::uuid;  -- SUBSTITUIR

-- 4. TESTAR A FUNÇÃO RPC DIRETAMENTE
-- =====================================================
-- Substitua 'AUTH_USER_ID_AQUI' pelo auth_user_id do técnico (UUID)
-- Você pode pegar o auth_user_id da primeira query
SELECT public.buscar_comissoes_tecnico('AUTH_USER_ID_AQUI'::uuid) as resultado_comissoes;

-- 5. VERIFICAR CONFIGURAÇÃO PADRÃO DA EMPRESA
-- =====================================================
-- Substitua 'EMPRESA_ID_AQUI' pelo empresa_id (você pode pegar da primeira query)
SELECT 
    cc.id,
    cc.empresa_id,
    cc.tipo_comissao,
    cc.comissao_fixa_padrao,
    cc.comissao_padrao,
    CASE 
        WHEN cc.tipo_comissao = 'fixo' THEN 'Fixo: R$ ' || COALESCE(cc.comissao_fixa_padrao::text, '0,00')
        WHEN cc.tipo_comissao = 'porcentagem' THEN 'Porcentagem: ' || COALESCE(cc.comissao_padrao::text, '0') || '%'
        ELSE 'Não configurado'
    END as configuracao_padrao
FROM configuracoes_comissao cc
WHERE cc.empresa_id = 'EMPRESA_ID_AQUI'::uuid;  -- SUBSTITUIR

