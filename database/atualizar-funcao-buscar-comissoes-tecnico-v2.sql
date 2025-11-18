-- =====================================================
-- ATUALIZAR FUNÇÃO buscar_comissoes_tecnico V2
-- =====================================================
-- Agora que as comissões são registradas na tabela comissoes_historico,
-- a função deve buscar diretamente dessa tabela ao invés de calcular das OSs

DROP FUNCTION IF EXISTS public.buscar_comissoes_tecnico(uuid);

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
BEGIN
    -- Buscar dados do técnico (pode ser auth_user_id ou id)
    SELECT 
        u.id,
        u.auth_user_id
    INTO tecnico_record
    FROM usuarios u
    WHERE (u.auth_user_id = tecnico_id_param OR u.id = tecnico_id_param)
    AND u.nivel = 'tecnico'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN '[]'::JSON;
    END IF;
    
    -- Buscar comissões registradas na tabela comissoes_historico
    -- Usar o id real do técnico (não o auth_user_id)
    SELECT json_agg(
        json_build_object(
            'id', ch.id,
            'ordem_servico_id', ch.ordem_servico_id,
            'numero_os', COALESCE(os.numero_os::text, 'N/A'),
            'valor_servico', COALESCE(ch.valor_servico, 0),
            'valor_peca', COALESCE(ch.valor_peca, 0),
            'valor_total', COALESCE(ch.valor_total, 0),
            'tipo_comissao', ch.tipo_comissao,
            'percentual_comissao', ch.percentual_comissao,
            'valor_comissao_fixa', ch.valor_comissao_fixa,
            'valor_comissao', COALESCE(ch.valor_comissao, 0),
            'data_entrega', ch.data_entrega,
            'status', COALESCE(ch.status, 'CALCULADA'),
            'tipo_ordem', COALESCE(ch.tipo_ordem, 'normal'),
            'created_at', ch.created_at,
            'cliente_nome', COALESCE(c.nome, 'Cliente não encontrado'),
            'servico_nome', COALESCE(os.servico, 'Serviço não especificado')
        )
    )
    INTO resultado
    FROM comissoes_historico ch
    LEFT JOIN ordens_servico os ON os.id = ch.ordem_servico_id
    LEFT JOIN clientes c ON c.id = ch.cliente_id
    WHERE ch.tecnico_id = tecnico_record.id
    ORDER BY ch.data_entrega DESC, ch.created_at DESC;
    
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
    proargnames AS argument_names
FROM pg_proc
WHERE proname = 'buscar_comissoes_tecnico'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

