-- =====================================================
-- TRIGGER SEM CONDIÇÃO WHEN - FORÇA EXECUÇÃO
-- =====================================================
-- Versão que SEMPRE executa a função (sem WHEN) para garantir que seja chamada

-- 1. RECRIAR A FUNÇÃO COM LOGS DETALHADOS
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
    -- LOG: Trigger foi chamado
    RAISE WARNING '🔔 TRIGGER CHAMADO - OS: %, Status: %, Status Técnico: %, Data Entrega: %, Técnico ID: %', 
        NEW.id, NEW.status, NEW.status_tecnico, NEW.data_entrega, NEW.tecnico_id;
    
    -- Verificar se atende os critérios básicos
    IF NOT ((NEW.status = 'ENTREGUE' OR NEW.status_tecnico = 'FINALIZADA')
            AND NEW.data_entrega IS NOT NULL
            AND NEW.tecnico_id IS NOT NULL) THEN
        RAISE WARNING '❌ NÃO ATENDE CRITÉRIOS - Status: %, Status Técnico: %, Data Entrega: %, Técnico: %', 
            NEW.status, NEW.status_tecnico, NEW.data_entrega, NEW.tecnico_id;
        RETURN NEW;
    END IF;
    
    RAISE WARNING '✅ ATENDE CRITÉRIOS BÁSICOS';
    
    -- Verificar se já existe comissão registrada para esta OS
    SELECT id INTO comissao_existente
    FROM comissoes_historico
    WHERE ordem_servico_id = NEW.id
    LIMIT 1;
    
    -- Se já existe, não registrar novamente
    IF comissao_existente IS NOT NULL THEN
        RAISE WARNING '⚠️ COMISSÃO JÁ EXISTE - ID: %', comissao_existente;
        RETURN NEW;
    END IF;
    
    RAISE WARNING '🔍 Buscando dados do técnico: %', NEW.tecnico_id;
    
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
        RAISE WARNING '❌ TÉCNICO NÃO ENCONTRADO - ID: %', NEW.tecnico_id;
        RETURN NEW;
    END IF;
    
    RAISE WARNING '✅ TÉCNICO ENCONTRADO - Empresa: %, Tipo Comissão: %', 
        tecnico_record.empresa_id, tecnico_record.tipo_comissao;
    
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
        RAISE WARNING '📊 Usando configuração individual - Tipo: %, Valor: %', tipo_comissao_tecnico, valor_comissao_tecnico;
    ELSIF config_comissao_record.tipo_comissao IS NOT NULL THEN
        tipo_comissao_tecnico := config_comissao_record.tipo_comissao;
        IF config_comissao_record.tipo_comissao = 'fixo' THEN
            valor_comissao_tecnico := COALESCE(config_comissao_record.comissao_fixa_padrao, 0);
        ELSE
            valor_comissao_tecnico := COALESCE(config_comissao_record.comissao_padrao, 0);
        END IF;
        RAISE WARNING '📊 Usando configuração padrão - Tipo: %, Valor: %', tipo_comissao_tecnico, valor_comissao_tecnico;
    ELSE
        tipo_comissao_tecnico := 'porcentagem';
        valor_comissao_tecnico := 10;
        RAISE WARNING '📊 Usando fallback - Tipo: %, Valor: %', tipo_comissao_tecnico, valor_comissao_tecnico;
    END IF;
    
    -- Calcular valor da comissão
    IF tipo_comissao_tecnico = 'fixo' THEN
        valor_comissao_calculado := valor_comissao_tecnico;
    ELSIF tipo_comissao_tecnico = 'porcentagem' THEN
        valor_comissao_calculado := (COALESCE(NEW.valor_faturado, 0) * valor_comissao_tecnico / 100);
    ELSE
        valor_comissao_calculado := 0;
    END IF;
    
    RAISE WARNING '💰 Valor comissão calculado: % (Valor faturado: %)', valor_comissao_calculado, NEW.valor_faturado;
    
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
        
        RAISE WARNING '✅✅✅ COMISSÃO REGISTRADA COM SUCESSO! ID da OS: %', NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌❌❌ ERRO AO REGISTRAR COMISSÃO: % - % - OS: %', SQLSTATE, SQLERRM, NEW.id;
        RAISE WARNING '   Detalhes: empresa_id=%, cliente_id=%, tecnico_id=%', NEW.empresa_id, NEW.cliente_id, NEW.tecnico_id;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. RECRIAR O TRIGGER SEM CONDIÇÃO WHEN
-- =====================================================
-- SEM WHEN = sempre executa a função (a função decide se processa ou não)
DROP TRIGGER IF EXISTS trigger_registrar_comissao ON ordens_servico;

CREATE TRIGGER trigger_registrar_comissao
    AFTER UPDATE ON ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION registrar_comissao_automatica();

-- 3. VERIFICAR SE FOI CRIADA COM SECURITY DEFINER
-- =====================================================
SELECT 
    proname,
    prosecdef as security_definer,
    proowner::regrole as owner
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 4. GARANTIR PERMISSÕES
-- =====================================================
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO postgres;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO service_role;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO authenticated;

-- 5. VERIFICAR TRIGGER
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_registrar_comissao';

-- 6. COMO VER OS LOGS
-- =====================================================
-- Os logs RAISE WARNING aparecem nos logs do PostgreSQL
-- No Supabase Dashboard: Database > Logs > Postgres Logs
-- Ou execute: SELECT * FROM pg_stat_activity WHERE state = 'active';

