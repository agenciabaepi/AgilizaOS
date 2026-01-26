-- =====================================================
-- CORRIGIR TRIGGER PARA SER CASE-INSENSITIVE
-- =====================================================
-- O problema é que o trigger verifica 'ENTREGUE' ou 'FINALIZADA' (maiúsculo)
-- mas as O.S. podem estar sendo salvas como 'finalizada' (minúsculo)
-- Este script corrige o trigger para aceitar qualquer combinação de maiúsculas/minúsculas

-- 1. RECRIAR A FUNÇÃO COM VERIFICAÇÃO CASE-INSENSITIVE
-- =====================================================
CREATE OR REPLACE FUNCTION registrar_comissao_automatica()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tecnico_record RECORD;
    config_comissao_record RECORD;
    tipo_comissao_tecnico VARCHAR(20);
    valor_comissao_tecnico DECIMAL(10,2);
    valor_comissao_calculado DECIMAL(10,2);
    comissao_existente UUID;
    status_normalizado TEXT;
    status_tecnico_normalizado TEXT;
BEGIN
    -- Normalizar status para maiúsculo para comparação
    status_normalizado := UPPER(TRIM(COALESCE(NEW.status, '')));
    status_tecnico_normalizado := UPPER(TRIM(COALESCE(NEW.status_tecnico, '')));
    
    -- Verificar se atende os critérios básicos (case-insensitive)
    IF NOT (
        (status_normalizado = 'ENTREGUE' OR status_normalizado = 'FINALIZADA' OR 
         status_tecnico_normalizado = 'FINALIZADA')
        AND NEW.data_entrega IS NOT NULL
        AND NEW.tecnico_id IS NOT NULL
    ) THEN
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
    
    -- Buscar dados do técnico INCLUINDO comissao_ativa
    SELECT 
        u.id,
        u.tipo_comissao,
        u.comissao_fixa,
        u.comissao_percentual,
        u.empresa_id,
        COALESCE(u.comissao_ativa, true) as comissao_ativa
    INTO tecnico_record
    FROM usuarios u
    WHERE u.id = NEW.tecnico_id
    AND u.nivel = 'tecnico'
    LIMIT 1;
    
    -- Se técnico não encontrado, não calcular comissão
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- ✅ VERIFICAR SE O TÉCNICO TEM COMISSÃO ATIVA
    -- Se comissao_ativa = false, NÃO registrar comissão
    IF tecnico_record.comissao_ativa = false THEN
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
            observacoes,
            ativa
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
            NULL,
            true
        );
    EXCEPTION WHEN OTHERS THEN
        -- Se campo 'ativa' não existir, tentar sem ele
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
            RAISE WARNING 'Erro ao registrar comissão para OS %: %', NEW.id, SQLERRM;
        END;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. RECRIAR O TRIGGER COM VERIFICAÇÃO CASE-INSENSITIVE NO WHEN
-- =====================================================
DROP TRIGGER IF EXISTS trigger_registrar_comissao ON ordens_servico;

CREATE TRIGGER trigger_registrar_comissao
    AFTER UPDATE ON ordens_servico
    FOR EACH ROW
    WHEN (
        -- Verificação case-insensitive: aceita 'ENTREGUE', 'entregue', 'FINALIZADA', 'finalizada', etc.
        (UPPER(TRIM(COALESCE(NEW.status, ''))) = 'ENTREGUE' 
         OR UPPER(TRIM(COALESCE(NEW.status, ''))) = 'FINALIZADA'
         OR UPPER(TRIM(COALESCE(NEW.status_tecnico, ''))) = 'FINALIZADA')
        AND NEW.data_entrega IS NOT NULL
        AND NEW.tecnico_id IS NOT NULL
    )
    EXECUTE FUNCTION registrar_comissao_automatica();

-- 3. CONCEDER PERMISSÕES
-- =====================================================
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO service_role;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO postgres;

-- 4. VERIFICAR SE FOI ATUALIZADO
-- =====================================================
SELECT 
    proname as nome_funcao,
    CASE 
        WHEN prosrc LIKE '%UPPER%status%' AND prosrc LIKE '%FINALIZADA%'
        THEN '✅ ATUALIZADO - Verificação case-insensitive implementada'
        ELSE '⚠️ Verificar se foi atualizado corretamente'
    END as status_verificacao
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 5. TESTE: VERIFICAR STATUS DAS O.S. FINALIZADAS
-- =====================================================
SELECT 
    id,
    numero_os,
    status,
    UPPER(TRIM(COALESCE(status, ''))) as status_normalizado,
    status_tecnico,
    UPPER(TRIM(COALESCE(status_tecnico, ''))) as status_tecnico_normalizado,
    data_entrega,
    tecnico_id,
    CASE 
        WHEN (UPPER(TRIM(COALESCE(status, ''))) = 'ENTREGUE' 
              OR UPPER(TRIM(COALESCE(status, ''))) = 'FINALIZADA'
              OR UPPER(TRIM(COALESCE(status_tecnico, ''))) = 'FINALIZADA')
             AND data_entrega IS NOT NULL
             AND tecnico_id IS NOT NULL
        THEN '✅ ATENDE CRITÉRIOS - Trigger DEVERIA executar'
        ELSE '❌ NÃO atende critérios'
    END as resultado_trigger
FROM ordens_servico
WHERE status ILIKE '%finalizad%' OR status_tecnico ILIKE '%finalizad%'
ORDER BY updated_at DESC
LIMIT 10;
