-- =====================================================
-- DIAGNÓSTICO: POR QUE NENHUMA COMISSÃO FOI REGISTRADA?
-- =====================================================

-- 1. VERIFICAR O.S. FINALIZADAS E SEUS TÉCNICOS
-- =====================================================
SELECT 
    os.id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.tecnico_id,
    os.valor_faturado,
    os.empresa_id,
    u.nome as tecnico_nome,
    u.comissao_ativa,
    u.nivel as tecnico_nivel,
    u.tipo_comissao,
    u.comissao_percentual,
    u.comissao_fixa,
    CASE 
        WHEN ch.id IS NOT NULL THEN '✅ TEM COMISSÃO'
        ELSE '❌ SEM COMISSÃO'
    END as status_comissao,
    ch.id as comissao_id
FROM ordens_servico os
LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
LEFT JOIN usuarios u ON u.id = os.tecnico_id
WHERE (
    UPPER(TRIM(COALESCE(os.status, ''))) = 'ENTREGUE' 
    OR UPPER(TRIM(COALESCE(os.status, ''))) = 'FINALIZADA'
    OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) = 'FINALIZADA'
)
AND os.data_entrega IS NOT NULL
AND os.tecnico_id IS NOT NULL
AND ch.id IS NULL -- Sem comissão registrada
ORDER BY os.numero_os DESC
LIMIT 20;

-- 2. VERIFICAR SE OS TÉCNICOS SÃO VÁLIDOS
-- =====================================================
SELECT 
    u.id,
    u.nome,
    u.nivel,
    u.comissao_ativa,
    CASE 
        WHEN u.nivel != 'tecnico' THEN '❌ NÃO É TÉCNICO'
        WHEN u.comissao_ativa = false THEN '❌ COMISSÃO DESATIVADA'
        ELSE '✅ TÉCNICO VÁLIDO'
    END as status_tecnico,
    u.tipo_comissao,
    u.comissao_percentual,
    u.comissao_fixa
FROM usuarios u
WHERE u.id IN (
    SELECT DISTINCT os.tecnico_id
    FROM ordens_servico os
    WHERE (
        UPPER(TRIM(COALESCE(os.status, ''))) = 'ENTREGUE' 
        OR UPPER(TRIM(COALESCE(os.status, ''))) = 'FINALIZADA'
        OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) = 'FINALIZADA'
    )
    AND os.data_entrega IS NOT NULL
    AND os.tecnico_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM comissoes_historico ch 
        WHERE ch.ordem_servico_id = os.id
    )
)
ORDER BY u.nome;

-- 3. VERIFICAR CONFIGURAÇÕES DE COMISSÃO DAS EMPRESAS
-- =====================================================
SELECT 
    cc.empresa_id,
    cc.tipo_comissao,
    cc.comissao_fixa_padrao,
    cc.comissao_padrao,
    COUNT(os.id) as total_os_pendentes
FROM configuracoes_comissao cc
INNER JOIN ordens_servico os ON os.empresa_id = cc.empresa_id
WHERE (
    UPPER(TRIM(COALESCE(os.status, ''))) = 'ENTREGUE' 
    OR UPPER(TRIM(COALESCE(os.status, ''))) = 'FINALIZADA'
    OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) = 'FINALIZADA'
)
AND os.data_entrega IS NOT NULL
AND os.tecnico_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM comissoes_historico ch 
    WHERE ch.ordem_servico_id = os.id
)
GROUP BY cc.empresa_id, cc.tipo_comissao, cc.comissao_fixa_padrao, cc.comissao_padrao;

-- 4. TESTE DE REGISTRO PARA UMA O.S. ESPECÍFICA
-- =====================================================
-- Execute manualmente para uma O.S. específica
DO $$
DECLARE
    os_id_test UUID := 'e8a2f7ff-8e2a-4c46-99f2-688af36e4f40'; -- OS #7
    os_record RECORD;
    tecnico_record RECORD;
    config_comissao_record RECORD;
    tipo_comissao_tecnico VARCHAR(20);
    valor_comissao_tecnico DECIMAL(10,2);
    valor_comissao_calculado DECIMAL(10,2);
    comissao_id UUID;
BEGIN
    RAISE NOTICE '🔍 Testando registro de comissão para OS: %', os_id_test;
    
    -- Buscar O.S.
    SELECT * INTO os_record
    FROM ordens_servico
    WHERE id = os_id_test;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'OS não encontrada: %', os_id_test;
    END IF;
    
    RAISE NOTICE '📋 OS encontrada: #%, Status: %, Status Técnico: %, Data Entrega: %, Técnico: %', 
        os_record.numero_os, os_record.status, os_record.status_tecnico, 
        os_record.data_entrega, os_record.tecnico_id;
    
    -- Buscar técnico (SEM filtro de nível primeiro para verificar se existe)
    SELECT 
        u.id,
        u.nome,
        u.nivel,
        u.comissao_ativa,
        u.tipo_comissao,
        u.comissao_fixa,
        u.comissao_percentual,
        u.empresa_id
    INTO tecnico_record
    FROM usuarios u
    WHERE u.id = os_record.tecnico_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Técnico não encontrado para OS: % - Técnico ID: %', os_id_test, os_record.tecnico_id;
    END IF;
    
    RAISE NOTICE '👤 Técnico encontrado: %, Nível: %, Comissão Ativa: %', 
        tecnico_record.nome, tecnico_record.nivel, tecnico_record.comissao_ativa;
    
    IF tecnico_record.nivel != 'tecnico' THEN
        RAISE EXCEPTION 'Usuário não é técnico: %', tecnico_record.nome;
    END IF;
    
    IF tecnico_record.comissao_ativa = false THEN
        RAISE EXCEPTION 'Técnico tem comissão desativada: %', tecnico_record.nome;
    END IF;
    
    -- Buscar configuração
    SELECT 
        tipo_comissao,
        comissao_fixa_padrao,
        comissao_padrao
    INTO config_comissao_record
    FROM configuracoes_comissao
    WHERE empresa_id = tecnico_record.empresa_id
    LIMIT 1;
    
    RAISE NOTICE '⚙️ Configuração empresa: Tipo: %, Fixo: %, Percentual: %', 
        config_comissao_record.tipo_comissao, 
        config_comissao_record.comissao_fixa_padrao,
        config_comissao_record.comissao_padrao;
    
    -- Determinar tipo e valor
    IF tecnico_record.tipo_comissao IS NOT NULL THEN
        tipo_comissao_tecnico := tecnico_record.tipo_comissao;
        IF tecnico_record.tipo_comissao = 'fixo' THEN
            valor_comissao_tecnico := COALESCE(tecnico_record.comissao_fixa, 0);
        ELSE
            valor_comissao_tecnico := COALESCE(tecnico_record.comissao_percentual, 0);
        END IF;
        RAISE NOTICE '📊 Usando configuração individual: Tipo: %, Valor: %', tipo_comissao_tecnico, valor_comissao_tecnico;
    ELSIF config_comissao_record.tipo_comissao IS NOT NULL THEN
        tipo_comissao_tecnico := config_comissao_record.tipo_comissao;
        IF config_comissao_record.tipo_comissao = 'fixo' THEN
            valor_comissao_tecnico := COALESCE(config_comissao_record.comissao_fixa_padrao, 0);
        ELSE
            valor_comissao_tecnico := COALESCE(config_comissao_record.comissao_padrao, 0);
        END IF;
        RAISE NOTICE '📊 Usando configuração padrão: Tipo: %, Valor: %', tipo_comissao_tecnico, valor_comissao_tecnico;
    ELSE
        tipo_comissao_tecnico := 'porcentagem';
        valor_comissao_tecnico := 10;
        RAISE NOTICE '📊 Usando fallback: Tipo: %, Valor: %', tipo_comissao_tecnico, valor_comissao_tecnico;
    END IF;
    
    -- Calcular valor
    IF tipo_comissao_tecnico = 'fixo' THEN
        valor_comissao_calculado := valor_comissao_tecnico;
    ELSIF tipo_comissao_tecnico = 'porcentagem' THEN
        valor_comissao_calculado := (COALESCE(os_record.valor_faturado, 0) * valor_comissao_tecnico / 100);
    ELSE
        valor_comissao_calculado := 0;
    END IF;
    
    RAISE NOTICE '💰 Valor calculado: R$ % (Valor faturado: R$ %)', 
        valor_comissao_calculado, os_record.valor_faturado;
    
    -- Verificar se já existe comissão
    SELECT id INTO comissao_id
    FROM comissoes_historico
    WHERE ordem_servico_id = os_id_test
    LIMIT 1;
    
    IF comissao_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Comissão já existe: %', comissao_id;
        RETURN;
    END IF;
    
    -- Tentar inserir
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
            observacoes,
            ativa
        ) VALUES (
            os_record.tecnico_id,
            os_record.id,
            os_record.empresa_id,
            os_record.cliente_id,
            COALESCE(os_record.valor_servico, 0),
            COALESCE(os_record.valor_peca, 0),
            COALESCE(os_record.valor_faturado, 0),
            tipo_comissao_tecnico,
            CASE WHEN tipo_comissao_tecnico = 'porcentagem' THEN valor_comissao_tecnico ELSE NULL END,
            CASE WHEN tipo_comissao_tecnico = 'fixo' THEN valor_comissao_tecnico ELSE NULL END,
            valor_comissao_calculado,
            os_record.data_entrega::TIMESTAMP WITH TIME ZONE,
            NOW(),
            'CALCULADA',
            COALESCE(LOWER(os_record.tipo), 'normal'),
            'Teste de diagnóstico',
            true
        ) RETURNING id INTO comissao_id;
        
        RAISE NOTICE '✅✅✅ COMISSÃO REGISTRADA COM SUCESSO! ID: %', comissao_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌ ERRO ao inserir comissão: %', SQLERRM;
        RAISE WARNING 'Tentando sem campo ativa...';
        
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
                os_record.tecnico_id,
                os_record.id,
                os_record.empresa_id,
                os_record.cliente_id,
                COALESCE(os_record.valor_servico, 0),
                COALESCE(os_record.valor_peca, 0),
                COALESCE(os_record.valor_faturado, 0),
                tipo_comissao_tecnico,
                CASE WHEN tipo_comissao_tecnico = 'porcentagem' THEN valor_comissao_tecnico ELSE NULL END,
                CASE WHEN tipo_comissao_tecnico = 'fixo' THEN valor_comissao_tecnico ELSE NULL END,
                valor_comissao_calculado,
                os_record.data_entrega::TIMESTAMP WITH TIME ZONE,
                NOW(),
                'CALCULADA',
                COALESCE(LOWER(os_record.tipo), 'normal'),
                'Teste de diagnóstico'
            ) RETURNING id INTO comissao_id;
            
            RAISE NOTICE '✅✅✅ COMISSÃO REGISTRADA (sem campo ativa)! ID: %', comissao_id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION '❌❌❌ ERRO ao inserir comissão (sem campo ativa): %', SQLERRM;
        END;
    END;
END;
$$;
