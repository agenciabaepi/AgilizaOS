-- =====================================================
-- FORÇAR REGISTRO DE COMISSÕES PENDENTES
-- =====================================================
-- Execute este script para registrar as comissões das O.S. que já foram finalizadas
-- mas não tiveram comissão registrada pelo trigger

-- 1. IDENTIFICAR E REGISTRAR COMISSÕES PENDENTES
-- =====================================================
DO $$
DECLARE
    os_record RECORD;
    tecnico_record RECORD;
    config_comissao_record RECORD;
    tipo_comissao_tecnico VARCHAR(20);
    valor_comissao_tecnico DECIMAL(10,2);
    valor_comissao_calculado DECIMAL(10,2);
    comissao_id UUID;
    total_registradas INTEGER := 0;
    total_puladas INTEGER := 0;
    total_erros INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 Iniciando registro de comissões pendentes...';
    
    FOR os_record IN 
        SELECT os.*
        FROM ordens_servico os
        LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
        WHERE (
            UPPER(TRIM(COALESCE(os.status, ''))) = 'ENTREGUE' 
            OR UPPER(TRIM(COALESCE(os.status, ''))) = 'FINALIZADA'
            OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) = 'FINALIZADA'
        )
        AND os.data_entrega IS NOT NULL
        AND os.tecnico_id IS NOT NULL
        AND ch.id IS NULL -- Sem comissão registrada
        ORDER BY os.numero_os DESC
    LOOP
        BEGIN
            RAISE NOTICE '📋 Processando OS #% (ID: %)', os_record.numero_os, os_record.id;
            
            -- Buscar dados do técnico
            SELECT 
                u.id,
                u.nome,
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
                RAISE WARNING '⚠️ Técnico não encontrado para OS #% - Pulando', os_record.numero_os;
                total_puladas := total_puladas + 1;
                CONTINUE;
            END IF;
            
            -- Verificar se técnico tem comissão ativa
            IF tecnico_record.comissao_ativa = false THEN
                RAISE WARNING '⚠️ Técnico % tem comissão desativada para OS #% - Pulando', tecnico_record.nome, os_record.numero_os;
                total_puladas := total_puladas + 1;
                CONTINUE;
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
            
            RAISE NOTICE '💰 Calculando comissão - Tipo: %, Valor base: %, Valor calculado: %', 
                tipo_comissao_tecnico, valor_comissao_tecnico, valor_comissao_calculado;
            
            -- Registrar comissão
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
                    'Registrado manualmente - O.S. já estava finalizada',
                    true
                ) RETURNING id INTO comissao_id;
                
                RAISE NOTICE '✅ Comissão registrada para OS #% - ID: %, Valor: R$ %', 
                    os_record.numero_os, comissao_id, valor_comissao_calculado;
                total_registradas := total_registradas + 1;
                
            EXCEPTION WHEN OTHERS THEN
                -- Tentar sem o campo 'ativa'
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
                        'Registrado manualmente - O.S. já estava finalizada'
                    ) RETURNING id INTO comissao_id;
                    
                    RAISE NOTICE '✅ Comissão registrada para OS #% (sem campo ativa) - ID: %, Valor: R$ %', 
                        os_record.numero_os, comissao_id, valor_comissao_calculado;
                    total_registradas := total_registradas + 1;
                    
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING '❌ Erro ao registrar comissão para OS #%: %', os_record.numero_os, SQLERRM;
                    total_erros := total_erros + 1;
                END;
            END;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ Erro geral ao processar OS #%: %', os_record.numero_os, SQLERRM;
            total_erros := total_erros + 1;
        END;
    END LOOP;
    
    RAISE NOTICE '📊 RESUMO FINAL:';
    RAISE NOTICE '  ✅ Comissões registradas: %', total_registradas;
    RAISE NOTICE '  ⚠️  Puladas (técnico sem comissão ativa ou não encontrado): %', total_puladas;
    RAISE NOTICE '  ❌ Erros: %', total_erros;
END;
$$;

-- 2. VERIFICAR RESULTADO
-- =====================================================
SELECT 
    COUNT(*) as total_comissoes_registradas,
    SUM(valor_comissao) as total_valor_comissoes,
    AVG(valor_comissao) as media_comissao
FROM comissoes_historico
WHERE observacoes = 'Registrado manualmente - O.S. já estava finalizada';
