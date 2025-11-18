-- =====================================================
-- TESTE RÁPIDO: Verificar se comissões estão funcionando
-- =====================================================
-- Execute estas queries na ordem para diagnosticar rapidamente

-- PASSO 1: Listar todos os técnicos (para pegar os IDs)
-- =====================================================
SELECT 
    u.id as tecnico_id,
    u.nome,
    u.auth_user_id,
    u.empresa_id,
    u.tipo_comissao,
    u.comissao_fixa,
    u.comissao_percentual
FROM usuarios u
WHERE u.nivel = 'tecnico'
ORDER BY u.nome;

-- PASSO 2: Escolha um técnico da lista acima e substitua nos queries abaixo
-- =====================================================
-- Exemplo: se o técnico tem id = '123e4567-e89b-12d3-a456-426614174000'
-- e auth_user_id = '987fcdeb-51a2-43f1-b789-123456789abc'
-- use esses valores nas queries abaixo

-- PASSO 3: Verificar OSs de um técnico específico
-- =====================================================
-- SUBSTITUA 'SEU_TECNICO_ID_AQUI' pelo id do técnico (da query acima)
SELECT 
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.valor_faturado,
    CASE 
        WHEN (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA') 
             AND os.data_entrega IS NOT NULL 
        THEN '✅ DEVE GERAR COMISSÃO'
        ELSE '❌ NÃO gera comissão'
    END as status_comissao
FROM ordens_servico os
WHERE os.tecnico_id = 'SEU_TECNICO_ID_AQUI'::uuid  -- SUBSTITUIR
ORDER BY os.created_at DESC
LIMIT 10;

-- PASSO 4: Testar a função RPC diretamente
-- =====================================================
-- SUBSTITUA 'SEU_AUTH_USER_ID_AQUI' pelo auth_user_id do técnico (da primeira query)
SELECT public.buscar_comissoes_tecnico('SEU_AUTH_USER_ID_AQUI'::uuid) as comissoes;

-- PASSO 5: Se a função retornar array vazio [], verifique:
-- =====================================================
-- 1. Se o técnico tem OSs com status 'ENTREGUE' ou status_tecnico 'FINALIZADA'
-- 2. Se essas OSs têm data_entrega preenchida
-- 3. Se o técnico tem configuração de comissão (individual ou padrão da empresa)

