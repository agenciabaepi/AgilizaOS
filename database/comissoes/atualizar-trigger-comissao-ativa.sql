-- =====================================================
-- ATUALIZAR TRIGGER PARA VERIFICAR comissao_ativa DO TÉCNICO
-- =====================================================
-- Execute este script no Supabase SQL Editor para atualizar o trigger
-- Este script corrige o trigger para verificar comissao_ativa antes de registrar

-- 1. VERIFICAR A VERSÃO ATUAL DA FUNÇÃO
-- =====================================================
-- Primeiro, vamos ver o código atual para confirmar se precisa atualizar
SELECT 
    proname as nome_funcao,
    CASE 
        WHEN prosrc LIKE '%comissao_ativa%' THEN '✅ Já verifica comissao_ativa'
        ELSE '❌ NÃO verifica comissao_ativa - Precisa atualizar'
    END as status
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 2. ATUALIZAR A FUNÇÃO COM VERIFICAÇÃO DE comissao_ativa
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
        COALESCE(u.comissao_ativa, true) as comissao_ativa -- Se NULL, considera ativa (compatibilidade)
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
        -- Log para debug (opcional)
        RAISE WARNING 'Comissão não registrada: Técnico tem comissao_ativa = false. Técnico ID: %, OS: %', 
            tecnico_record.id, NEW.id;
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
        -- Verificar se o campo 'ativa' existe na tabela antes de inserir
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
            ativa -- Campo ativa (será true por padrão para novas comissões)
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
            true -- Comissão criada é sempre ativa por padrão
        );
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro (por exemplo, se campo 'ativa' não existir), tentar sem ele
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
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CONCEDER PERMISSÕES
-- =====================================================
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO service_role;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO postgres;

-- 4. VERIFICAR SE A FUNÇÃO FOI ATUALIZADA
-- =====================================================
SELECT 
    proname as nome_funcao,
    CASE 
        WHEN prosrc LIKE '%comissao_ativa%' AND prosrc LIKE '%IF tecnico_record.comissao_ativa = false%' 
        THEN '✅ ATUALIZADO - Verifica comissao_ativa corretamente'
        ELSE '⚠️ Verificação necessária'
    END as status_verificacao
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 5. TESTE: VERIFICAR UM TÉCNICO E SUA CONFIGURAÇÃO
-- =====================================================
-- Execute para verificar se os técnicos têm comissao_ativa configurado
SELECT 
    id,
    nome,
    nivel,
    comissao_ativa,
    tipo_comissao,
    comissao_percentual,
    comissao_fixa
FROM usuarios
WHERE nivel = 'tecnico'
ORDER BY nome
LIMIT 10;
