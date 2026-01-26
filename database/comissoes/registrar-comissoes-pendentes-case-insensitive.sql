-- =====================================================
-- REGISTRAR COMISSÕES PENDENTES (CASE-INSENSITIVE)
-- =====================================================
-- Após corrigir o trigger, execute este script para registrar
-- as comissões das O.S. que já foram finalizadas mas não tiveram comissão registrada

-- 1. IDENTIFICAR O.S. FINALIZADAS SEM COMISSÃO REGISTRADA
-- =====================================================
SELECT 
    os.id as os_id,
    os.numero_os,
    os.status,
    os.status_tecnico,
    os.data_entrega,
    os.tecnico_id,
    os.valor_faturado,
    os.valor_servico,
    os.valor_peca,
    u.nome as tecnico_nome,
    u.comissao_ativa,
    CASE 
        WHEN ch.id IS NOT NULL THEN '✅ Já tem comissão'
        ELSE '❌ SEM comissão - Precisa registrar'
    END as status_comissao
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
ORDER BY os.data_entrega DESC;

-- 2. FUNÇÃO PARA REGISTRAR COMISSÃO MANUALMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION registrar_comissao_pendente(os_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    os_record RECORD;
    tecnico_record RECORD;
    config_comissao_record RECORD;
    tipo_comissao_tecnico VARCHAR(20);
    valor_comissao_tecnico DECIMAL(10,2);
    valor_comissao_calculado DECIMAL(10,2);
    comissao_id UUID;
BEGIN
    -- Buscar dados da OS
    SELECT * INTO os_record
    FROM ordens_servico
    WHERE id = os_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'OS não encontrada: %', os_id;
    END IF;
    
    -- Verificar se já tem comissão
    SELECT id INTO comissao_id
    FROM comissoes_historico
    WHERE ordem_servico_id = os_id
    LIMIT 1;
    
    IF comissao_id IS NOT NULL THEN
        RAISE NOTICE 'OS já tem comissão registrada: %', comissao_id;
        RETURN comissao_id;
    END IF;
    
    -- Buscar dados do técnico
    SELECT 
        u.id,
        u.tipo_comissao,
        u.comissao_fixa,
        u.comissao_percentual,
        u.empresa_id,
        COALESCE(u.comissao_ativa, true) as comissao_ativa
    INTO tecnico_record
    FROM usuarios u
    WHERE u.id = os_record.tecnico_id
    AND u.nivel = 'tecnico'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Técnico não encontrado para OS: %', os_id;
    END IF;
    
    -- Verificar se técnico tem comissão ativa
    IF tecnico_record.comissao_ativa = false THEN
        RAISE NOTICE 'Técnico tem comissão desativada, não registrando para OS: %', os_id;
        RETURN NULL;
    END IF;
    
    -- Buscar configuração padrão
    SELECT 
        tipo_comissao,
        comissao_fixa_padrao,
        comissao_padrao
    INTO config_comissao_record
    FROM configuracoes_comissao
    WHERE empresa_id = tecnico_record.empresa_id
    LIMIT 1;
    
    -- Determinar tipo e valor
    IF tecnico_record.tipo_comissao IS NOT NULL THEN
        tipo_comissao_tecnico := tecnico_record.tipo_comissao;
        IF tecnico_record.tipo_comissao = 'fixo' THEN
            valor_comissao_tecnico := COALESCE(tecnico_record.comissao_fixa, 0);
        ELSE
            valor_comissao_tecnico := COALESCE(tecnico_record.comissao_percentual, 0);
        END IF;
    ELSIF config_comissao_record.tipo_comissao IS NOT NULL THEN
        tipo_comissao_tecnico := config_comissao_record.tipo_comissao;
        IF config_comissao_record.tipo_comissao = 'fixo' THEN
            valor_comissao_tecnico := COALESCE(config_comissao_record.comissao_fixa_padrao, 0);
        ELSE
            valor_comissao_tecnico := COALESCE(config_comissao_record.comissao_padrao, 0);
        END IF;
    ELSE
        tipo_comissao_tecnico := 'porcentagem';
        valor_comissao_tecnico := 10;
    END IF;
    
    -- Calcular valor
    IF tipo_comissao_tecnico = 'fixo' THEN
        valor_comissao_calculado := valor_comissao_tecnico;
    ELSIF tipo_comissao_tecnico = 'porcentagem' THEN
        valor_comissao_calculado := (COALESCE(os_record.valor_faturado, 0) * valor_comissao_tecnico / 100);
    ELSE
        valor_comissao_calculado := 0;
    END IF;
    
    -- Registrar comissão
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
        'Registrado manualmente após correção do trigger',
        true
    ) RETURNING id INTO comissao_id;
    
    RETURN comissao_id;
END;
$$;

-- 3. REGISTRAR COMISSÕES PENDENTES AUTOMATICAMENTE
-- =====================================================
-- Execute este bloco para registrar todas as comissões pendentes de uma vez
DO $$
DECLARE
    os_record RECORD;
    comissao_id UUID;
    total_registradas INTEGER := 0;
    total_puladas INTEGER := 0;
BEGIN
    FOR os_record IN 
        SELECT os.id
        FROM ordens_servico os
        LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
        WHERE (
            UPPER(TRIM(COALESCE(os.status, ''))) = 'ENTREGUE' 
            OR UPPER(TRIM(COALESCE(os.status, ''))) = 'FINALIZADA'
            OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) = 'FINALIZADA'
        )
        AND os.data_entrega IS NOT NULL
        AND os.tecnico_id IS NOT NULL
        AND ch.id IS NULL
    LOOP
        BEGIN
            comissao_id := registrar_comissao_pendente(os_record.id);
            IF comissao_id IS NOT NULL THEN
                total_registradas := total_registradas + 1;
                RAISE NOTICE '✅ Comissão registrada para OS: %, ID: %', os_record.id, comissao_id;
            ELSE
                total_puladas := total_puladas + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ Erro ao registrar comissão para OS %: %', os_record.id, SQLERRM;
            total_puladas := total_puladas + 1;
        END;
    END LOOP;
    
    RAISE NOTICE '📊 RESUMO: % comissões registradas, % puladas', total_registradas, total_puladas;
END;
$$;

-- 4. VERIFICAR RESULTADO
-- =====================================================
SELECT 
    COUNT(*) as total_comissoes_registradas,
    SUM(valor_comissao) as total_valor_comissoes
FROM comissoes_historico
WHERE observacoes = 'Registrado manualmente após correção do trigger';
