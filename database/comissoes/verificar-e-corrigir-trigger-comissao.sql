-- =====================================================
-- VERIFICAR E CORRIGIR TRIGGER DE COMISSÕES
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- Este script atualiza o trigger para verificar comissao_ativa do técnico

-- 1. VERIFICAR SE O CAMPO comissao_ativa EXISTE NA TABELA usuarios
-- =====================================================
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
AND column_name = 'comissao_ativa';

-- 2. VERIFICAR VERSÃO ATUAL DO TRIGGER
-- =====================================================
-- Verificar se a função atual verifica comissao_ativa
SELECT 
    proname as nome_funcao,
    CASE 
        WHEN prosrc LIKE '%comissao_ativa%' AND prosrc LIKE '%false%' 
        THEN '✅ Já verifica comissao_ativa'
        ELSE '❌ NÃO verifica comissao_ativa - Precisa atualizar'
    END as status_verificacao
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 3. RECRIAR A FUNÇÃO COM VERIFICAÇÃO DE comissao_ativa
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
BEGIN
    -- Verificar se atende os critérios básicos
    IF NOT ((NEW.status = 'ENTREGUE' OR NEW.status_tecnico = 'FINALIZADA')
            AND NEW.data_entrega IS NOT NULL
            AND NEW.tecnico_id IS NOT NULL) THEN
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
        -- ✅ IMPORTANTE: Buscar comissao_ativa (se NULL, considerar true para compatibilidade)
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
    
    -- ✅ VERIFICAÇÃO CRÍTICA: SE O TÉCNICO TEM COMISSÃO ATIVA
    -- Se comissao_ativa = false, NÃO registrar comissão
    IF tecnico_record.comissao_ativa = false THEN
        -- Não registrar comissão para técnico desativado
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

-- 4. RECRIAR O TRIGGER
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

-- 5. CONCEDER PERMISSÕES
-- =====================================================
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO service_role;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO postgres;

-- 6. VERIFICAR SE FOI ATUALIZADO CORRETAMENTE
-- =====================================================
SELECT 
    proname as nome_funcao,
    CASE 
        WHEN prosrc LIKE '%comissao_ativa%' AND prosrc LIKE '%IF tecnico_record.comissao_ativa = false%' 
        THEN '✅ SUCESSO - Trigger atualizado e verificando comissao_ativa'
        ELSE '❌ ERRO - Trigger não foi atualizado corretamente'
    END as status_final
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 7. VERIFICAR SE O TRIGGER ESTÁ ATIVO
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_registrar_comissao';
