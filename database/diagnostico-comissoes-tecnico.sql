-- =====================================================
-- DIAGNÓSTICO: Por que não aparecem comissões?
-- =====================================================
-- Este script ajuda a identificar o problema

-- 1. VERIFICAR SE O TÉCNICO EXISTE E TEM CONFIGURAÇÃO
-- =====================================================
-- Substitua 'AUTH_USER_ID_DO_TECNICO' pelo auth_user_id real do técnico
SELECT 
    u.id,
    u.nome,
    u.auth_user_id,
    u.nivel,
    u.empresa_id,
    u.tipo_comissao,
    u.comissao_fixa,
    u.comissao_percentual
FROM usuarios u
WHERE u.auth_user_id = 'AUTH_USER_ID_DO_TECNICO' -- SUBSTITUIR
   OR u.id = 'AUTH_USER_ID_DO_TECNICO'::uuid; -- SUBSTITUIR

-- 2. VERIFICAR CONFIGURAÇÃO PADRÃO DA EMPRESA
-- =====================================================
-- Substitua 'EMPRESA_ID' pelo empresa_id do técnico
SELECT 
    cc.id,
    cc.empresa_id,
    cc.tipo_comissao,
    cc.comissao_fixa_padrao,
    cc.comissao_padrao
FROM configuracoes_comissao cc
WHERE cc.empresa_id = 'EMPRESA_ID'::uuid; -- SUBSTITUIR

-- 3. VERIFICAR OSs DO TÉCNICO QUE DEVERIAM GERAR COMISSÃO
-- =====================================================
-- Substitua 'TECNICO_ID' pelo id do técnico (não auth_user_id)
SELECT 
    os.id,
    os.numero_os,
    os.tecnico_id,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.valor_faturado,
    os.valor_servico,
    os.valor_peca,
    CASE 
        WHEN os.status = 'ENTREGUE' THEN '✅ Status = ENTREGUE'
        WHEN os.status_tecnico = 'FINALIZADA' THEN '✅ Status Técnico = FINALIZADA'
        ELSE '❌ Não atende critério de status'
    END as criterio_status,
    CASE 
        WHEN os.data_entrega IS NOT NULL THEN '✅ Tem data_entrega'
        ELSE '❌ Sem data_entrega'
    END as criterio_data
FROM ordens_servico os
WHERE os.tecnico_id = 'TECNICO_ID'::uuid -- SUBSTITUIR
ORDER BY os.created_at DESC
LIMIT 20;

-- 4. VERIFICAR OSs QUE ATENDEM TODOS OS CRITÉRIOS
-- =====================================================
-- Substitua 'TECNICO_ID' pelo id do técnico
SELECT 
    os.id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.valor_faturado
FROM ordens_servico os
WHERE os.tecnico_id = 'TECNICO_ID'::uuid -- SUBSTITUIR
  AND (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
  AND os.data_entrega IS NOT NULL
ORDER BY os.data_entrega DESC;

-- 5. TESTAR A FUNÇÃO RPC DIRETAMENTE
-- =====================================================
-- Substitua 'AUTH_USER_ID_DO_TECNICO' pelo auth_user_id real
SELECT public.buscar_comissoes_tecnico('AUTH_USER_ID_DO_TECNICO'::uuid); -- SUBSTITUIR

-- 6. VERIFICAR SE HÁ MÚLTIPLAS FUNÇÕES COM MESMO NOME
-- =====================================================
SELECT 
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments,
    pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'buscar_comissoes_tecnico'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

