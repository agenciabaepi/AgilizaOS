-- =====================================================
-- CORRIGIR TRIGGER DE REGISTRO DE COMISSÕES
-- =====================================================
-- Este script corrige a lógica do trigger para garantir que funcione corretamente

-- 1. RECRIAR A FUNÇÃO COM LÓGICA MELHORADA E LOGS
-- =====================================================
CREATE OR REPLACE FUNCTION registrar_comissao_automatica()
RETURNS TRIGGER AS $$
DECLARE
    tecnico_record RECORD;
    config_comissao_record RECORD;
    tipo_comissao_tecnico VARCHAR(20);
    valor_comissao_tecnico DECIMAL(10,2);
    valor_comissao_calculado DECIMAL(10,2);
    comissao_existente UUID;
BEGIN
    -- Verificar se atende os critérios básicos
    IF NOT ((NEW.status = 'ENTREGUE' OR NEW.status_tecnico = 'FINALIZADA')
            AND NEW.data_entrega IS NOT NULL
            AND NEW.tecnico_id IS NOT NULL) THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se houve mudança relevante (status mudou para ENTREGUE/FINALIZADA ou data_entrega foi preenchida)
    -- Se já estava ENTREGUE/FINALIZADA com data_entrega e nada mudou, não processar
    IF (OLD.status = 'ENTREGUE' OR OLD.status_tecnico = 'FINALIZADA')
       AND OLD.data_entrega IS NOT NULL
       AND (NEW.status = OLD.status OR (NEW.status = 'ENTREGUE' AND OLD.status = 'ENTREGUE'))
       AND (NEW.status_tecnico = OLD.status_tecnico OR (NEW.status_tecnico = 'FINALIZADA' AND OLD.status_tecnico = 'FINALIZADA'))
       AND NEW.data_entrega = OLD.data_entrega THEN
        -- Não houve mudança relevante, não processar
        RETURN NEW;
    END IF;
    
    -- Verificar se já existe comissão registrada para esta OS
    SELECT id INTO comissao_existente
    FROM comissoes_historico
    WHERE ordem_servico_id = NEW.id
    LIMIT 1;
    
    -- Se já existe, não registrar novamente
    IF comissao_existente IS NOT NULL THEN
        RETURN NEW;
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
    WHERE u.id = NEW.tecnico_id
    AND u.nivel = 'tecnico'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN NEW;
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
    -- Prioridade: 1. Configuração individual do técnico, 2. Configuração padrão da empresa
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
        -- Fallback: usar porcentagem padrão de 10%
        tipo_comissao_tecnico := 'porcentagem';
        valor_comissao_tecnico := 10;
    END IF;
    
    -- Calcular valor da comissão
    IF tipo_comissao_tecnico = 'fixo' THEN
        valor_comissao_calculado := valor_comissao_tecnico;
    ELSIF tipo_comissao_tecnico = 'porcentagem' THEN
        valor_comissao_calculado := (COALESCE(NEW.valor_faturado, 0) * valor_comissao_tecnico / 100);
    ELSE
        valor_comissao_calculado := 0;
    END IF;
    
    -- Registrar comissão na tabela comissoes_historico
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
            NEW.tecnico_id,
            NEW.id,
            NEW.empresa_id,
            NEW.cliente_id,
            COALESCE(NEW.valor_servico, 0),
            COALESCE(NEW.valor_peca, 0),
            COALESCE(NEW.valor_faturado, 0),
            tipo_comissao_tecnico,
            CASE WHEN tipo_comissao_tecnico = 'porcentagem' THEN valor_comissao_tecnico ELSE NULL END,
            CASE WHEN tipo_comissao_tecnico = 'fixo' THEN valor_comissao_tecnico ELSE NULL END,
            valor_comissao_calculado,
            NEW.data_entrega::TIMESTAMP WITH TIME ZONE,
            NOW(),
            'CALCULADA',
            COALESCE(LOWER(NEW.tipo), 'normal'),
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro, apenas retornar NEW sem quebrar a atualização da OS
        RAISE WARNING 'Erro ao registrar comissão para OS %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. RECRIAR O TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS trigger_registrar_comissao ON ordens_servico;

CREATE TRIGGER trigger_registrar_comissao
    AFTER UPDATE ON ordens_servico
    FOR EACH ROW
    WHEN (
        (NEW.status = 'ENTREGUE' OR NEW.status_tecnico = 'FINALIZADA')
        AND NEW.data_entrega IS NOT NULL
        AND NEW.tecnico_id IS NOT NULL
    )
    EXECUTE FUNCTION registrar_comissao_automatica();

-- 3. VERIFICAR SE FOI CRIADO
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_registrar_comissao';

