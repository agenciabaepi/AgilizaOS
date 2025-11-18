-- =====================================================
-- TESTAR INSERÇÃO MANUAL DE COMISSÃO
-- =====================================================
-- Este script testa se conseguimos inserir manualmente na tabela
-- Se funcionar, o problema é no trigger. Se não funcionar, é permissão/RLS.

-- 1. BUSCAR UMA OS RECÉM FINALIZADA PARA TESTAR
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
    os.valor_servico,
    os.valor_peca,
    os.tipo
FROM ordens_servico os
WHERE (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
AND os.data_entrega IS NOT NULL
AND os.tecnico_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM comissoes_historico ch 
    WHERE ch.ordem_servico_id = os.id
)
ORDER BY os.updated_at DESC
LIMIT 1;

-- 2. TESTAR INSERÇÃO MANUAL (substitua os valores pelos da query acima)
-- =====================================================
-- Copie os valores da query acima e substitua abaixo
DO $$
DECLARE
    os_id_test UUID := 'SUBSTITUIR_PELO_ID_DA_OS'::uuid;
    tecnico_id_test UUID := 'SUBSTITUIR_PELO_TECNICO_ID'::uuid;
    empresa_id_test UUID := 'SUBSTITUIR_PELO_EMPRESA_ID'::uuid;
    cliente_id_test UUID := 'SUBSTITUIR_PELO_CLIENTE_ID'::uuid;  -- pode ser NULL
    valor_faturado_test DECIMAL := 100.00;  -- substituir pelo valor real
    comissao_id UUID;
BEGIN
    -- Tentar inserir diretamente
    BEGIN
        INSERT INTO comissoes_historico (
            tecnico_id,
            ordem_servico_id,
            empresa_id,
            cliente_id,
            valor_servico,
            valor_peca,
            valor_total,
            tipo_comissao,
            percentual_comissao,
            valor_comissao_fixa,
            valor_comissao,
            data_entrega,
            data_calculo,
            status,
            tipo_ordem,
            observacoes
        ) VALUES (
            tecnico_id_test,
            os_id_test,
            empresa_id_test,
            cliente_id_test,
            0,
            0,
            valor_faturado_test,
            'porcentagem',
            10,
            NULL,
            valor_faturado_test * 0.10,
            NOW(),
            NOW(),
            'CALCULADA',
            'normal',
            'Teste manual'
        )
        RETURNING id INTO comissao_id;
        
        RAISE NOTICE '✅ INSERÇÃO MANUAL FUNCIONOU! ID: %', comissao_id;
        
        -- Limpar o teste
        DELETE FROM comissoes_historico WHERE id = comissao_id;
        RAISE NOTICE '🧹 Teste removido';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO NA INSERÇÃO MANUAL: % - %', SQLSTATE, SQLERRM;
    END;
END $$;

-- 3. VERIFICAR RLS NA TABELA
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'comissoes_historico';

-- 4. VERIFICAR POLÍTICAS RLS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'comissoes_historico';

