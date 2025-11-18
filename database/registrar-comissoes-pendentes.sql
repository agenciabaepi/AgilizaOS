-- =====================================================
-- REGISTRAR COMISSÕES PENDENTES
-- =====================================================
-- Este script registra comissões para OSs que já estavam finalizadas
-- mas não têm comissão registrada (porque o trigger foi criado depois)

-- IMPORTANTE: O trigger só funciona para OSs atualizadas DEPOIS de ser criado
-- Este script registra as comissões das OSs que já estavam finalizadas

DO $$
DECLARE
    os_record RECORD;
    tecnico_record RECORD;
    config_comissao_record RECORD;
    tipo_comissao_tecnico VARCHAR(20);
    valor_comissao_tecnico DECIMAL(10,2);
    valor_comissao_calculado DECIMAL(10,2);
    comissao_existente UUID;
    total_processadas INTEGER := 0;
    total_registradas INTEGER := 0;
    total_erros INTEGER := 0;
BEGIN
    -- Processar todas as OSs que deveriam ter comissão mas não têm
    FOR os_record IN 
        SELECT os.*
        FROM ordens_servico os
        LEFT JOIN comissoes_historico ch ON ch.ordem_servico_id = os.id
        WHERE (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
        AND os.data_entrega IS NOT NULL
        AND os.tecnico_id IS NOT NULL
        AND ch.id IS NULL
        ORDER BY os.updated_at DESC
    LOOP
        total_processadas := total_processadas + 1;
        
        BEGIN
            -- Verificar se já existe comissão (dupla verificação)
            SELECT id INTO comissao_existente
            FROM comissoes_historico
            WHERE ordem_servico_id = os_record.id
            LIMIT 1;
            
            IF comissao_existente IS NOT NULL THEN
                CONTINUE;
            END IF;
            
            -- Buscar dados do técnico
            SELECT 
                u.id,
                u.tipo_comissao,
                u.comissao_fixa,
                u.comissao_percentual,
                u.empresa_id
            INTO tecnico_record
            FROM usuarios u
            WHERE u.id = os_record.tecnico_id
            AND u.nivel = 'tecnico'
            LIMIT 1;
            
            IF NOT FOUND THEN
                total_erros := total_erros + 1;
                RAISE WARNING 'Técnico não encontrado para OS %', os_record.numero_os;
                CONTINUE;
            END IF;
            
            -- Buscar configuração padrão de comissão da empresa
            SELECT 
                tipo_comissao,
                comissao_fixa_padrao,
                comissao_padrao
            INTO config_comissao_record
            FROM configuracoes_comissao
            WHERE empresa_id = tecnico_record.empresa_id
            LIMIT 1;
            
            -- Determinar tipo e valor de comissão a usar
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
            
            -- Calcular valor da comissão
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
                'Registrado automaticamente pelo script de sincronização'
            );
            
            total_registradas := total_registradas + 1;
            
        EXCEPTION WHEN OTHERS THEN
            total_erros := total_erros + 1;
            RAISE WARNING 'Erro ao registrar comissão para OS %: %', os_record.numero_os, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Processamento concluído!';
    RAISE NOTICE '   OSs processadas: %', total_processadas;
    RAISE NOTICE '   Comissões registradas: %', total_registradas;
    RAISE NOTICE '   Erros: %', total_erros;
END $$;

-- Verificar resultado
SELECT 
    COUNT(*) as total_comissoes,
    COUNT(*) FILTER (WHERE status = 'CALCULADA') as calculadas,
    SUM(valor_comissao) as total_comissoes_valor
FROM comissoes_historico;

