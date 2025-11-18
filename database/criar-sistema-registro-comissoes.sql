-- =====================================================
-- SISTEMA DE REGISTRO AUTOMÁTICO DE COMISSÕES
-- =====================================================
-- Este script cria um trigger que registra comissões automaticamente
-- quando uma OS é marcada como ENTREGUE ou FINALIZADA

-- 1. VERIFICAR/CRIAR ESTRUTURA DA TABELA comissoes_historico
-- =====================================================
-- Primeiro, vamos verificar se a tabela existe e tem a estrutura correta
DO $$
BEGIN
    -- Criar tabela se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'comissoes_historico' 
                   AND table_schema = 'public') THEN
        
        CREATE TABLE comissoes_historico (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tecnico_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            ordem_servico_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
            empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
            cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
            
            -- Valores da OS
            valor_servico DECIMAL(10,2) DEFAULT 0,
            valor_peca DECIMAL(10,2) DEFAULT 0,
            valor_total DECIMAL(10,2) DEFAULT 0,
            
            -- Configuração de comissão usada
            tipo_comissao VARCHAR(20) CHECK (tipo_comissao IN ('porcentagem', 'fixo')),
            percentual_comissao DECIMAL(10,2),
            valor_comissao_fixa DECIMAL(10,2),
            valor_comissao DECIMAL(10,2) NOT NULL,
            
            -- Dados da OS
            data_entrega TIMESTAMP WITH TIME ZONE NOT NULL,
            data_calculo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            data_pagamento TIMESTAMP WITH TIME ZONE,
            status VARCHAR(50) DEFAULT 'CALCULADA',
            tipo_ordem VARCHAR(50) DEFAULT 'normal',
            observacoes TEXT,
            
            -- Metadados
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_comissoes_historico_tecnico_id 
            ON comissoes_historico(tecnico_id);
        CREATE INDEX IF NOT EXISTS idx_comissoes_historico_os_id 
            ON comissoes_historico(ordem_servico_id);
        CREATE INDEX IF NOT EXISTS idx_comissoes_historico_data_entrega 
            ON comissoes_historico(data_entrega DESC);
        CREATE INDEX IF NOT EXISTS idx_comissoes_historico_created_at 
            ON comissoes_historico(created_at DESC);
        
        RAISE NOTICE 'Tabela comissoes_historico criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela comissoes_historico já existe';
    END IF;
END $$;

-- 2. FUNÇÃO PARA CALCULAR E REGISTRAR COMISSÃO
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
    -- Só processar se a OS foi marcada como ENTREGUE ou FINALIZADA
    -- E tem data_entrega preenchida
    -- E o status mudou (não estava ENTREGUE/FINALIZADA antes OU não tinha data_entrega antes)
    IF (NEW.status = 'ENTREGUE' OR NEW.status_tecnico = 'FINALIZADA')
       AND NEW.data_entrega IS NOT NULL
       AND NEW.tecnico_id IS NOT NULL
       AND (
           (OLD.status != 'ENTREGUE' AND OLD.status_tecnico != 'FINALIZADA')
           OR (OLD.data_entrega IS NULL AND NEW.data_entrega IS NOT NULL)
       ) THEN
        
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
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CRIAR TRIGGER PARA REGISTRAR COMISSÃO AUTOMATICAMENTE
-- =====================================================
DROP TRIGGER IF EXISTS trigger_registrar_comissao ON ordens_servico;

CREATE TRIGGER trigger_registrar_comissao
    AFTER UPDATE ON ordens_servico
    FOR EACH ROW
    WHEN (
        (NEW.status = 'ENTREGUE' OR NEW.status_tecnico = 'FINALIZADA')
        AND NEW.data_entrega IS NOT NULL
        AND NEW.tecnico_id IS NOT NULL
        AND (
            (OLD.status != 'ENTREGUE' AND OLD.status_tecnico != 'FINALIZADA')
            OR (OLD.data_entrega IS NULL AND NEW.data_entrega IS NOT NULL)
        )
    )
    EXECUTE FUNCTION registrar_comissao_automatica();

-- 4. COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION registrar_comissao_automatica() IS 
'Registra comissão automaticamente quando uma OS é marcada como ENTREGUE ou FINALIZADA com data_entrega preenchida';

COMMENT ON TRIGGER trigger_registrar_comissao ON ordens_servico IS 
'Trigger que executa após atualização de OS para registrar comissão do técnico';

