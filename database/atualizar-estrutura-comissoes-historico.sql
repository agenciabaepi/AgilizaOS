-- =====================================================
-- ATUALIZAR ESTRUTURA DA TABELA comissoes_historico
-- =====================================================
-- Este script adiciona os campos faltantes na tabela existente

-- 1. PREENCHER CAMPOS FALTANTES DOS REGISTROS EXISTENTES
-- =====================================================

-- Preencher empresa_id dos registros existentes baseado na OS
UPDATE comissoes_historico ch
SET empresa_id = os.empresa_id
FROM ordens_servico os
WHERE ch.ordem_servico_id = os.id
AND ch.empresa_id IS NULL;

-- Preencher cliente_id dos registros existentes baseado na OS
UPDATE comissoes_historico ch
SET cliente_id = os.cliente_id
FROM ordens_servico os
WHERE ch.ordem_servico_id = os.id
AND ch.cliente_id IS NULL;

-- Preencher tipo_comissao dos registros existentes (assumir porcentagem se tem percentual_comissao)
UPDATE comissoes_historico
SET tipo_comissao = 'porcentagem'
WHERE tipo_comissao IS NULL
AND percentual_comissao IS NOT NULL;

-- Preencher data_calculo dos registros existentes com created_at (se ainda estiver NULL)
UPDATE comissoes_historico
SET data_calculo = COALESCE(data_calculo, created_at)
WHERE data_calculo IS NULL;

-- 2. CRIAR ÍNDICES (se ainda não existirem)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_comissoes_historico_empresa_id 
    ON comissoes_historico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_historico_cliente_id 
    ON comissoes_historico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_historico_tipo_comissao 
    ON comissoes_historico(tipo_comissao);
CREATE INDEX IF NOT EXISTS idx_comissoes_historico_data_calculo 
    ON comissoes_historico(data_calculo DESC);
CREATE INDEX IF NOT EXISTS idx_comissoes_historico_data_pagamento 
    ON comissoes_historico(data_pagamento DESC);

-- 3. VERIFICAR ESTRUTURA FINAL
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'comissoes_historico'
AND table_schema = 'public'
ORDER BY ordinal_position;

