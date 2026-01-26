-- =====================================================
-- CORRIGIR TRIGGER DEFINITIVO - REGISTRO AUTOMÁTICO
-- =====================================================
-- Este script corrige o trigger para funcionar automaticamente
-- sem necessidade de registro manual

-- 1. VERIFICAR SE O TÉCNICO EXISTE PARA AS O.S. FINALIZADAS
-- =====================================================
SELECT 
    os.id,
    os.numero_os,
    os.tecnico_id as tecnico_id_na_os,
    u.id as tecnico_id_encontrado,
    u.nome as tecnico_nome,
    u.nivel,
    CASE 
        WHEN u.id IS NULL THEN '❌ TÉCNICO NÃO EXISTE - Precisamos corrigir o tecnico_id'
        WHEN u.nivel != 'tecnico' THEN '⚠️ Usuário não é técnico'
        ELSE '✅ Técnico válido'
    END as status
FROM ordens_servico os
LEFT JOIN usuarios u ON u.id = os.tecnico_id
WHERE os.numero_os IN (7, 47, 1312, 46, 1308, 1311, 1310, 1305, 1307, 1306)
AND (
    UPPER(TRIM(COALESCE(os.status, ''))) = 'ENTREGUE' 
    OR UPPER(TRIM(COALESCE(os.status, ''))) = 'FINALIZADA'
    OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) = 'FINALIZADA'
);

-- 2. RECRIAR A FUNÇÃO DO TRIGGER COM TRATAMENTO ROBUSTO
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
    
    -- Buscar dados do técnico (SEM filtrar por nível primeiro)
    SELECT 
        u.id,
        u.nome,
        u.nivel,
        u.tipo_comissao,
        u.comissao_fixa,
        u.comissao_percentual,
        u.empresa_id,
        COALESCE(u.comissao_ativa, true) as comissao_ativa
    INTO tecnico_record
    FROM usuarios u
    WHERE u.id = NEW.tecnico_id
    LIMIT 1;
    
    -- Se técnico não encontrado, não calcular comissão
    IF NOT FOUND THEN
        -- Log de erro (mas não falha a atualização da OS)
        RAISE WARNING '⚠️ Técnico não encontrado para OS %. Técnico ID: %', NEW.numero_os, NEW.tecnico_id;
        RETURN NEW;
    END IF;
    
    -- Verificar se é técnico
    IF tecnico_record.nivel != 'tecnico' THEN
        RAISE WARNING '⚠️ Usuário não é técnico para OS %. Nome: %, Nível: %', 
            NEW.numero_os, tecnico_record.nome, tecnico_record.nivel;
        RETURN NEW;
    END IF;
    
    -- ✅ VERIFICAR SE O TÉCNICO TEM COMISSÃO ATIVA
    -- Se comissao_ativa = false, NÃO registrar comissão
    IF tecnico_record.comissao_ativa = false THEN
        RAISE WARNING '⚠️ Técnico % tem comissão desativada para OS %', 
            tecnico_record.nome, NEW.numero_os;
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
            -- Em caso de erro, apenas logar e não quebrar a atualização da OS
            RAISE WARNING '❌ Erro ao registrar comissão para OS %: %', NEW.id, SQLERRM;
        END;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RECRIAR O TRIGGER
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

-- 4. CONCEDER PERMISSÕES
-- =====================================================
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO service_role;
GRANT EXECUTE ON FUNCTION registrar_comissao_automatica() TO postgres;

-- 5. VERIFICAR SE FOI ATUALIZADO
-- =====================================================
SELECT 
    proname as nome_funcao,
    CASE 
        WHEN prosrc LIKE '%nivel != ''tecnico''%' THEN '✅ Função atualizada - Verifica nível corretamente'
        ELSE '⚠️ Verificar função'
    END as status_verificacao
FROM pg_proc
WHERE proname = 'registrar_comissao_automatica';

-- 6. TESTE: FORÇAR DISPARO DO TRIGGER EM UMA O.S. FINALIZADA
-- =====================================================
-- Execute esta query para forçar o trigger em uma O.S. que já está finalizada
-- O trigger só dispara em UPDATE, então precisamos fazer um UPDATE mesmo que pequeno
UPDATE ordens_servico 
SET updated_at = NOW() 
WHERE numero_os = 7 
  AND (status = 'ENTREGUE' OR status_tecnico = 'FINALIZADA')
  AND data_entrega IS NOT NULL
  AND tecnico_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM comissoes_historico ch 
      WHERE ch.ordem_servico_id = ordens_servico.id
  );

-- 7. VERIFICAR SE A COMISSÃO FOI REGISTRADA
-- =====================================================
SELECT 
    ch.id,
    ch.ordem_servico_id,
    os.numero_os,
    ch.tecnico_id,
    ch.valor_comissao,
    ch.status,
    ch.created_at
FROM comissoes_historico ch
INNER JOIN ordens_servico os ON os.id = ch.ordem_servico_id
WHERE os.numero_os = 7
ORDER BY ch.created_at DESC
LIMIT 5;
