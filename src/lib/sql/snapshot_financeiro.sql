-- =====================================================
-- VIEW PARA SNAPSHOT FINANCEIRO
-- =====================================================
-- Esta view calcula receita, despesas e lucro para um período específico

-- View para snapshot financeiro por empresa e período
CREATE OR REPLACE VIEW view_snapshot_financeiro AS
WITH receita_periodo AS (
    -- Calcular receita das vendas (total) do período
    SELECT 
        empresa_id,
        SUM(total) as receita_total,
        COUNT(*) as total_vendas,
        SUM(total) as receita_bruta,
        SUM(desconto) as total_descontos,
        SUM(acrescimo) as total_acrescimos
    FROM vendas 
    WHERE status = 'finalizada'
    GROUP BY empresa_id
),
despesas_periodo AS (
    -- Calcular despesas das contas a pagar do período
    SELECT 
        empresa_id,
        SUM(valor) as despesas_total,
        COUNT(*) as total_contas,
        SUM(valor) FILTER (WHERE status = 'pago') as despesas_pagas,
        SUM(valor) FILTER (WHERE status = 'pendente') as despesas_pendentes,
        SUM(valor) FILTER (WHERE status = 'vencido') as despesas_vencidas
    FROM contas_pagar
    GROUP BY empresa_id
)
SELECT 
    r.empresa_id,
    -- Receita
    COALESCE(r.receita_total, 0) as receita,
    COALESCE(r.receita_bruta, 0) as receita_bruta,
    COALESCE(r.total_descontos, 0) as descontos,
    COALESCE(r.total_acrescimos, 0) as acrescimos,
    COALESCE(r.total_vendas, 0) as total_vendas,
    -- Despesas
    COALESCE(d.despesas_total, 0) as despesas,
    COALESCE(d.despesas_pagas, 0) as despesas_pagas,
    COALESCE(d.despesas_pendentes, 0) as despesas_pendentes,
    COALESCE(d.despesas_vencidas, 0) as despesas_vencidas,
    COALESCE(d.total_contas, 0) as total_contas,
    -- Lucro
    COALESCE(r.receita_total, 0) - COALESCE(d.despesas_pagas, 0) as lucro,
    -- Margem
    CASE 
        WHEN COALESCE(r.receita_total, 0) > 0 
        THEN ((COALESCE(r.receita_total, 0) - COALESCE(d.despesas_pagas, 0)) / COALESCE(r.receita_total, 0)) * 100
        ELSE 0 
    END as margem_percentual
FROM receita_periodo r
FULL OUTER JOIN despesas_periodo d ON r.empresa_id = d.empresa_id;

-- =====================================================
-- FUNÇÃO PARA SNAPSHOT FINANCEIRO POR PERÍODO
-- =====================================================

CREATE OR REPLACE FUNCTION get_snapshot_financeiro_periodo(
    empresa_uuid UUID,
    data_inicio DATE,
    data_fim DATE
)
RETURNS TABLE (
    receita DECIMAL,
    receita_bruta DECIMAL,
    descontos DECIMAL,
    acrescimos DECIMAL,
    total_vendas INTEGER,
    despesas DECIMAL,
    despesas_pagas DECIMAL,
    despesas_pendentes DECIMAL,
    despesas_vencidas DECIMAL,
    total_contas INTEGER,
    lucro DECIMAL,
    margem_percentual DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH receita_periodo AS (
        SELECT 
            COALESCE(SUM(total), 0) as receita_total,
            COALESCE(COUNT(*), 0) as total_vendas,
            COALESCE(SUM(total), 0) as receita_bruta,
            COALESCE(SUM(desconto), 0) as total_descontos,
            COALESCE(SUM(acrescimo), 0) as total_acrescimos
        FROM vendas 
        WHERE empresa_id = empresa_uuid
        AND status = 'finalizada'
        AND DATE(data_venda) BETWEEN data_inicio AND data_fim
    ),
    receita_final AS (
        SELECT 
            COALESCE(MAX(rp.receita_total), 0) as receita_total,
            COALESCE(MAX(rp.total_vendas), 0) as total_vendas,
            COALESCE(MAX(rp.receita_bruta), 0) as receita_bruta,
            COALESCE(MAX(rp.total_descontos), 0) as total_descontos,
            COALESCE(MAX(rp.total_acrescimos), 0) as total_acrescimos
        FROM receita_periodo rp
    ),
    despesas_periodo AS (
        SELECT 
            -- Despesas pagas no período (usando data_pagamento para lucro real)
            -- IMPORTANTE: Para lucro real, só consideramos contas pagas no período
            COALESCE(SUM(valor) FILTER (
                WHERE status = 'pago' 
                AND data_pagamento IS NOT NULL 
                AND DATE(data_pagamento) BETWEEN data_inicio AND data_fim
            ), 0) as despesas_pagas,
            -- Despesas que vencem no período (para referência geral)
            COALESCE(SUM(valor) FILTER (WHERE data_vencimento BETWEEN data_inicio AND data_fim), 0) as despesas_total,
            COALESCE(COUNT(*) FILTER (WHERE data_vencimento BETWEEN data_inicio AND data_fim), 0) as total_contas,
            COALESCE(SUM(valor) FILTER (
                WHERE status = 'pendente' 
                AND data_vencimento BETWEEN data_inicio AND data_fim
            ), 0) as despesas_pendentes,
            COALESCE(SUM(valor) FILTER (
                WHERE status = 'vencido' 
                AND data_vencimento BETWEEN data_inicio AND data_fim
            ), 0) as despesas_vencidas
        FROM contas_pagar
        WHERE empresa_id = empresa_uuid
        AND (
            -- Incluir contas que foram pagas no período (para lucro real)
            (status = 'pago' AND data_pagamento IS NOT NULL AND DATE(data_pagamento) BETWEEN data_inicio AND data_fim)
            -- OU que vencem no período (para referência)
            OR (data_vencimento BETWEEN data_inicio AND data_fim)
        )
    ),
    despesas_final AS (
        SELECT 
            COALESCE(MAX(dp.despesas_pagas), 0) as despesas_pagas,
            COALESCE(MAX(dp.despesas_total), 0) as despesas_total,
            COALESCE(MAX(dp.total_contas), 0) as total_contas,
            COALESCE(MAX(dp.despesas_pendentes), 0) as despesas_pendentes,
            COALESCE(MAX(dp.despesas_vencidas), 0) as despesas_vencidas
        FROM despesas_periodo dp
    )
    SELECT 
        r.receita_total::DECIMAL,
        r.receita_bruta::DECIMAL,
        r.total_descontos::DECIMAL,
        r.total_acrescimos::DECIMAL,
        r.total_vendas::INTEGER,
        d.despesas_total::DECIMAL,
        d.despesas_pagas::DECIMAL,
        d.despesas_pendentes::DECIMAL,
        d.despesas_vencidas::DECIMAL,
        d.total_contas::INTEGER,
        (r.receita_total - d.despesas_pagas)::DECIMAL,
        CASE 
            WHEN r.receita_total > 0 
            THEN ((r.receita_total - d.despesas_pagas) / r.receita_total) * 100
            ELSE 0 
        END::DECIMAL
    FROM receita_final r
    CROSS JOIN despesas_final d;
END;
$$ language 'plpgsql';

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON VIEW view_snapshot_financeiro IS 'Snapshot financeiro geral por empresa';
COMMENT ON FUNCTION get_snapshot_financeiro_periodo IS 'Calcula snapshot financeiro para um período específico';

-- =====================================================
-- EXEMPLO DE USO
-- =====================================================

-- Para obter snapshot geral da empresa:
-- SELECT * FROM view_snapshot_financeiro WHERE empresa_id = 'uuid-da-empresa';

-- Para obter snapshot de um período específico:
-- SELECT * FROM get_snapshot_financeiro_periodo('uuid-da-empresa', '2024-01-01', '2024-01-31');
