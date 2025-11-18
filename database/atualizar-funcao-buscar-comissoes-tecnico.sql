-- =====================================================
-- ATUALIZAR FUNÇÃO buscar_comissoes_tecnico
-- =====================================================
-- Esta função precisa ser atualizada para suportar:
-- 1. Comissão por porcentagem (sistema antigo)
-- 2. Comissão fixa por aparelho (sistema novo)
-- 3. Verificar configuração do técnico individual
-- 4. Verificar configuração padrão da empresa

-- Primeiro, vamos verificar se a função existe
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'buscar_comissoes_tecnico'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- =====================================================
-- RECRIAR FUNÇÃO COM SUPORTE A COMISSÃO FIXA
-- =====================================================
-- IMPORTANTE: Remover ambas as versões antigas (text e uuid) antes de criar a nova

DROP FUNCTION IF EXISTS public.buscar_comissoes_tecnico(uuid);
DROP FUNCTION IF EXISTS public.buscar_comissoes_tecnico(text);

CREATE OR REPLACE FUNCTION public.buscar_comissoes_tecnico(
    tecnico_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resultado JSON;
    tecnico_record RECORD;
    config_comissao_record RECORD;
    tipo_comissao_tecnico VARCHAR(20);
    valor_comissao_tecnico DECIMAL(10,2);
    tipo_comissao_padrao VARCHAR(20);
    valor_comissao_padrao DECIMAL(10,2);
BEGIN
    -- Buscar dados do técnico
    -- Pode buscar por auth_user_id OU por id (caso o parâmetro seja o id direto)
    SELECT 
        u.id,
        u.nome,
        u.tipo_comissao,
        u.comissao_fixa,
        u.comissao_percentual,
        u.empresa_id,
        u.auth_user_id
    INTO tecnico_record
    FROM usuarios u
    WHERE (u.auth_user_id = tecnico_id_param OR u.id = tecnico_id_param)
    AND u.nivel = 'tecnico'
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Retornar array vazio se técnico não encontrado
        RETURN '[]'::JSON;
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
    
    -- Buscar OSs entregues do técnico e calcular comissões
    SELECT json_agg(
        json_build_object(
            'id', os.id,
            'ordem_servico_id', os.id,
            'numero_os', os.numero_os,
            'valor_servico', COALESCE(os.valor_servico, 0),
            'valor_peca', COALESCE(os.valor_peca, 0),
            'valor_total', COALESCE(os.valor_faturado, 0),
            'tipo_comissao', tipo_comissao_tecnico,
            'percentual_comissao', CASE 
                WHEN tipo_comissao_tecnico = 'porcentagem' THEN valor_comissao_tecnico
                ELSE NULL
            END,
            'valor_comissao_fixa', CASE 
                WHEN tipo_comissao_tecnico = 'fixo' THEN valor_comissao_tecnico
                ELSE NULL
            END,
            'valor_comissao', CASE 
                WHEN tipo_comissao_tecnico = 'fixo' THEN valor_comissao_tecnico
                WHEN tipo_comissao_tecnico = 'porcentagem' THEN 
                    (COALESCE(os.valor_faturado, 0) * valor_comissao_tecnico / 100)
                ELSE 0
            END,
            'data_entrega', os.data_entrega,
            'status', os.status,
            'tipo_ordem', COALESCE(os.tipo, 'servico'),
            'created_at', os.created_at
        )
    )
    INTO resultado
    FROM ordens_servico os
    WHERE os.tecnico_id = tecnico_record.id
    AND (os.status = 'ENTREGUE' OR os.status_tecnico = 'FINALIZADA')
    AND os.data_entrega IS NOT NULL
    ORDER BY os.data_entrega DESC;
    
    -- Retornar resultado (array vazio se não encontrou nenhuma OS)
    RETURN COALESCE(resultado, '[]'::JSON);
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.buscar_comissoes_tecnico(uuid) TO authenticated, service_role;

-- =====================================================
-- VERIFICAR FUNÇÃO CRIADA
-- =====================================================
SELECT 
    proname AS function_name,
    proargnames AS argument_names,
    pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'buscar_comissoes_tecnico'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

