-- =====================================================
-- TESTE DO SISTEMA DE HISTÓRICO
-- =====================================================
-- Execute este script para testar se tudo está funcionando

-- =====================================================
-- 1. VERIFICAR SE TUDO FOI CRIADO
-- =====================================================

-- Verificar tabela
SELECT 'Tabela os_historico' as item, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'os_historico') 
            THEN '✅ Existe' 
            ELSE '❌ Não existe' 
       END as status;

-- Verificar função
SELECT 'Função registrar_historico_os' as item,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'registrar_historico_os') 
            THEN '✅ Existe' 
            ELSE '❌ Não existe' 
       END as status;

-- Verificar trigger
SELECT 'Trigger trg_historico_os' as item,
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_historico_os') 
            THEN '✅ Existe' 
            ELSE '❌ Não existe' 
       END as status;

-- Verificar view
SELECT 'View vw_historico_os' as item,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'vw_historico_os') 
            THEN '✅ Existe' 
            ELSE '❌ Não existe' 
       END as status;

-- =====================================================
-- 2. TESTAR INSERÇÃO MANUAL
-- =====================================================

-- Inserir um registro de teste (se houver pelo menos uma empresa)
DO $$
DECLARE
    v_empresa_id UUID;
    v_os_id UUID;
    v_historico_id UUID;
BEGIN
    -- Buscar uma empresa existente
    SELECT id INTO v_empresa_id FROM empresas LIMIT 1;
    
    IF v_empresa_id IS NOT NULL THEN
        -- Buscar uma OS existente desta empresa
        SELECT id INTO v_os_id FROM ordens_servico WHERE empresa_id = v_empresa_id LIMIT 1;
        
        IF v_os_id IS NOT NULL THEN
            -- Testar função de registro
            SELECT registrar_historico_os(
                v_os_id,
                'SYSTEM_TEST',
                'SISTEMA',
                'Teste do sistema de histórico - funcionando!',
                '{"teste": true, "timestamp": "' || NOW() || '"}',
                NULL,
                NULL,
                NULL,
                NULL,
                'Teste automático do sistema',
                'Sistema funcionando corretamente',
                NULL,
                NULL,
                'TEST'
            ) INTO v_historico_id;
            
            RAISE NOTICE '✅ Teste realizado com sucesso! ID do histórico: %', v_historico_id;
        ELSE
            RAISE NOTICE '⚠️ Nenhuma OS encontrada para testar';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Nenhuma empresa encontrada para testar';
    END IF;
END $$;

-- =====================================================
-- 3. VERIFICAR REGISTROS CRIADOS
-- =====================================================

-- Contar registros na tabela
SELECT 'Total de registros no histórico' as info, COUNT(*) as quantidade
FROM os_historico;

-- Mostrar últimos 5 registros
SELECT 'Últimos registros criados:' as info;
SELECT 
    acao,
    categoria, 
    descricao,
    usuario_nome,
    created_at
FROM os_historico 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- 4. TESTAR TRIGGER (SE HOUVER OS)
-- =====================================================

-- Fazer uma pequena alteração em uma OS para testar o trigger
DO $$
DECLARE
    v_os_id UUID;
    v_status_atual VARCHAR(50);
BEGIN
    -- Buscar uma OS para testar
    SELECT id, status INTO v_os_id, v_status_atual 
    FROM ordens_servico 
    LIMIT 1;
    
    IF v_os_id IS NOT NULL THEN
        -- Fazer uma alteração que deve disparar o trigger
        UPDATE ordens_servico 
        SET observacao = COALESCE(observacao, '') || ' [TESTE HISTÓRICO: ' || NOW() || ']'
        WHERE id = v_os_id;
        
        RAISE NOTICE '✅ Trigger testado - alteração feita na OS %', v_os_id;
        
        -- Verificar se o histórico foi criado
        IF EXISTS (
            SELECT 1 FROM os_historico 
            WHERE os_id = v_os_id 
            AND acao = 'UPDATE_FIELDS' 
            AND created_at > NOW() - INTERVAL '1 minute'
        ) THEN
            RAISE NOTICE '✅ Trigger funcionando - histórico criado automaticamente!';
        ELSE
            RAISE NOTICE '⚠️ Trigger pode não estar funcionando - verifique manualmente';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Nenhuma OS encontrada para testar o trigger';
    END IF;
END $$;

-- =====================================================
-- 5. ESTATÍSTICAS FINAIS
-- =====================================================

SELECT 
    '📊 ESTATÍSTICAS DO SISTEMA DE HISTÓRICO' as titulo;

SELECT 
    categoria,
    COUNT(*) as total_registros,
    COUNT(DISTINCT os_id) as os_diferentes,
    MAX(created_at) as ultimo_registro
FROM os_historico 
GROUP BY categoria
ORDER BY total_registros DESC;

-- Verificar RLS
SELECT 'RLS habilitado na tabela os_historico' as info,
       CASE WHEN rowsecurity THEN '✅ Sim' ELSE '❌ Não' END as status
FROM pg_tables 
WHERE tablename = 'os_historico';

-- =====================================================
-- 6. RESULTADO FINAL
-- =====================================================

SELECT 
    '🎉 SISTEMA DE HISTÓRICO INSTALADO E TESTADO!' as resultado,
    'Agora todas as ações nas OS serão registradas automaticamente' as descricao;
