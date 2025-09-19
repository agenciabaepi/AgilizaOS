-- =====================================================
-- SCRIPT COMPLETO: SISTEMA DE CONTAS A PAGAR
-- =====================================================
-- Este script cria todas as tabelas necessárias para o sistema de contas a pagar
-- Execute este script no seu banco de dados Supabase

-- =====================================================
-- 1. CRIAR TABELA DE CATEGORIAS DE CONTAS
-- =====================================================

CREATE TABLE IF NOT EXISTS categorias_contas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) DEFAULT 'fixa' CHECK (tipo IN ('fixa', 'variavel', 'pecas')),
    cor VARCHAR(7) DEFAULT '#3B82F6',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar categorias duplicadas na mesma empresa
    CONSTRAINT unique_categoria_empresa UNIQUE (empresa_id, nome)
);

-- =====================================================
-- 2. CRIAR TABELA DE CONTAS A PAGAR
-- =====================================================

CREATE TABLE IF NOT EXISTS contas_pagar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias_contas(id) ON DELETE SET NULL,
    tipo VARCHAR(20) DEFAULT 'fixa' CHECK (tipo IN ('fixa', 'variavel', 'pecas')),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
    fornecedor VARCHAR(255),
    observacoes TEXT,
    os_id UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
    peca_nome VARCHAR(255),
    peca_quantidade INTEGER DEFAULT 1 CHECK (peca_quantidade > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para garantir que data_pagamento só existe se status for 'pago'
    CONSTRAINT check_data_pagamento CHECK (
        (status = 'pago' AND data_pagamento IS NOT NULL) OR 
        (status != 'pago' AND data_pagamento IS NULL)
    )
);

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para categorias_contas
CREATE INDEX IF NOT EXISTS idx_categorias_contas_empresa ON categorias_contas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_contas_tipo ON categorias_contas(tipo);
CREATE INDEX IF NOT EXISTS idx_categorias_contas_ativo ON categorias_contas(ativo);
CREATE INDEX IF NOT EXISTS idx_categorias_contas_nome ON categorias_contas(nome);

-- Índices para contas_pagar
CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa ON contas_pagar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_categoria ON contas_pagar(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_os ON contas_pagar(os_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_tipo ON contas_pagar(tipo);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_data_pagamento ON contas_pagar(data_pagamento);

-- Índice composto para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa_status ON contas_pagar(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa_vencimento ON contas_pagar(empresa_id, data_vencimento);

-- =====================================================
-- 4. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE categorias_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Políticas para categorias_contas
CREATE POLICY IF NOT EXISTS "Usuários podem ver categorias da própria empresa" 
    ON categorias_contas FOR SELECT 
    USING (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Usuários podem inserir categorias na própria empresa" 
    ON categorias_contas FOR INSERT 
    WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Usuários podem atualizar categorias da própria empresa" 
    ON categorias_contas FOR UPDATE 
    USING (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Usuários podem deletar categorias da própria empresa" 
    ON categorias_contas FOR DELETE 
    USING (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    ));

-- Políticas para contas_pagar
CREATE POLICY IF NOT EXISTS "Usuários podem ver contas da própria empresa" 
    ON contas_pagar FOR SELECT 
    USING (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Usuários podem inserir contas na própria empresa" 
    ON contas_pagar FOR INSERT 
    WITH CHECK (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Usuários podem atualizar contas da própria empresa" 
    ON contas_pagar FOR UPDATE 
    USING (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Usuários podem deletar contas da própria empresa" 
    ON contas_pagar FOR DELETE 
    USING (empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    ));

-- =====================================================
-- 6. CRIAR FUNÇÕES DE TRIGGER PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_categorias_contas_updated_at 
    BEFORE UPDATE ON categorias_contas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contas_pagar_updated_at 
    BEFORE UPDATE ON contas_pagar 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CRIAR FUNÇÃO PARA ATUALIZAR STATUS AUTOMATICAMENTE
-- =====================================================

-- Função para atualizar status baseado na data de vencimento
CREATE OR REPLACE FUNCTION update_conta_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a conta não foi paga e a data de vencimento passou, marcar como vencida
    IF NEW.status = 'pendente' AND NEW.data_vencimento < CURRENT_DATE THEN
        NEW.status = 'vencido';
    END IF;
    
    -- Se foi marcada como paga, definir data de pagamento
    IF NEW.status = 'pago' AND OLD.status != 'pago' THEN
        NEW.data_pagamento = CURRENT_DATE;
    END IF;
    
    -- Se foi marcada como pendente, limpar data de pagamento
    IF NEW.status = 'pendente' AND OLD.status = 'pago' THEN
        NEW.data_pagamento = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar status automaticamente
CREATE TRIGGER update_conta_status_trigger
    BEFORE UPDATE ON contas_pagar
    FOR EACH ROW EXECUTE FUNCTION update_conta_status();

-- =====================================================
-- 8. INSERIR CATEGORIAS PADRÃO
-- =====================================================

-- Função para inserir categorias padrão para uma empresa
CREATE OR REPLACE FUNCTION inserir_categorias_padrao(empresa_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Inserir categorias padrão (ignorar se já existirem)
    INSERT INTO categorias_contas (empresa_id, nome, tipo, cor, descricao) VALUES
    (empresa_uuid, 'Aluguel', 'fixa', '#EF4444', 'Categoria padrão para aluguel'),
    (empresa_uuid, 'Energia Elétrica', 'fixa', '#F59E0B', 'Categoria padrão para energia elétrica'),
    (empresa_uuid, 'Água', 'fixa', '#3B82F6', 'Categoria padrão para água'),
    (empresa_uuid, 'Internet', 'fixa', '#8B5CF6', 'Categoria padrão para internet'),
    (empresa_uuid, 'Telefone', 'fixa', '#06B6D4', 'Categoria padrão para telefone'),
    (empresa_uuid, 'Colaboradores', 'fixa', '#10B981', 'Categoria padrão para colaboradores'),
    (empresa_uuid, 'Material de Escritório', 'variavel', '#6B7280', 'Categoria padrão para material de escritório'),
    (empresa_uuid, 'Marketing', 'variavel', '#EC4899', 'Categoria padrão para marketing'),
    (empresa_uuid, 'Manutenção', 'variavel', '#F97316', 'Categoria padrão para manutenção'),
    (empresa_uuid, 'Peças', 'pecas', '#84CC16', 'Categoria padrão para peças'),
    (empresa_uuid, 'Ferramentas', 'variavel', '#6366F1', 'Categoria padrão para ferramentas'),
    (empresa_uuid, 'Outros', 'variavel', '#64748B', 'Categoria padrão para outros gastos')
    ON CONFLICT (empresa_id, nome) DO NOTHING;
END;
$$ language 'plpgsql';

-- =====================================================
-- 9. CRIAR VIEWS ÚTEIS
-- =====================================================

-- View para contas com informações da categoria
CREATE OR REPLACE VIEW view_contas_completas AS
SELECT 
    cp.id,
    cp.empresa_id,
    cp.categoria_id,
    cc.nome as categoria_nome,
    cc.tipo as categoria_tipo,
    cc.cor as categoria_cor,
    cp.tipo,
    cp.descricao,
    cp.valor,
    cp.data_vencimento,
    cp.data_pagamento,
    cp.status,
    cp.fornecedor,
    cp.observacoes,
    cp.os_id,
    cp.peca_nome,
    cp.peca_quantidade,
    cp.created_at,
    cp.updated_at,
    -- Campos calculados
    CASE 
        WHEN cp.status = 'pago' THEN 0
        WHEN cp.data_vencimento < CURRENT_DATE THEN cp.valor
        ELSE cp.valor
    END as valor_pendente,
    CASE 
        WHEN cp.data_vencimento < CURRENT_DATE AND cp.status != 'pago' THEN true
        ELSE false
    END as esta_vencida
FROM contas_pagar cp
LEFT JOIN categorias_contas cc ON cp.categoria_id = cc.id;

-- View para resumo financeiro por empresa
CREATE OR REPLACE VIEW view_resumo_financeiro AS
SELECT 
    empresa_id,
    COUNT(*) as total_contas,
    COUNT(*) FILTER (WHERE status = 'pendente') as contas_pendentes,
    COUNT(*) FILTER (WHERE status = 'pago') as contas_pagas,
    COUNT(*) FILTER (WHERE status = 'vencido') as contas_vencidas,
    SUM(valor) as valor_total,
    SUM(valor) FILTER (WHERE status = 'pendente') as valor_pendente,
    SUM(valor) FILTER (WHERE status = 'pago') as valor_pago,
    SUM(valor) FILTER (WHERE status = 'vencido') as valor_vencido,
    SUM(valor) FILTER (WHERE tipo = 'fixa') as valor_fixas,
    SUM(valor) FILTER (WHERE tipo = 'variavel') as valor_variaveis,
    SUM(valor) FILTER (WHERE tipo = 'pecas') as valor_pecas
FROM contas_pagar
GROUP BY empresa_id;

-- =====================================================
-- 10. CRIAR FUNÇÕES DE UTILIDADE
-- =====================================================

-- Função para buscar contas por período
CREATE OR REPLACE FUNCTION buscar_contas_por_periodo(
    empresa_uuid UUID,
    data_inicio DATE,
    data_fim DATE,
    status_filtro VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    descricao VARCHAR,
    valor DECIMAL,
    data_vencimento DATE,
    status VARCHAR,
    categoria_nome VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.descricao,
        cp.valor,
        cp.data_vencimento,
        cp.status,
        cc.nome as categoria_nome
    FROM contas_pagar cp
    LEFT JOIN categorias_contas cc ON cp.categoria_id = cc.id
    WHERE cp.empresa_id = empresa_uuid
    AND cp.data_vencimento BETWEEN data_inicio AND data_fim
    AND (status_filtro IS NULL OR cp.status = status_filtro)
    ORDER BY cp.data_vencimento DESC;
END;
$$ language 'plpgsql';

-- Função para marcar conta como paga
CREATE OR REPLACE FUNCTION marcar_conta_como_paga(conta_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    resultado BOOLEAN := false;
BEGIN
    UPDATE contas_pagar 
    SET 
        status = 'pago',
        data_pagamento = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = conta_uuid
    AND status != 'pago';
    
    GET DIAGNOSTICS resultado = FOUND;
    RETURN resultado;
END;
$$ language 'plpgsql';

-- =====================================================
-- 11. COMENTÁRIOS DAS TABELAS E COLUNAS
-- =====================================================

COMMENT ON TABLE categorias_contas IS 'Categorias para organizar as contas a pagar';
COMMENT ON COLUMN categorias_contas.tipo IS 'Tipo da categoria: fixa, variavel ou pecas';
COMMENT ON COLUMN categorias_contas.cor IS 'Cor hexadecimal para identificação visual';

COMMENT ON TABLE contas_pagar IS 'Contas a pagar da empresa';
COMMENT ON COLUMN contas_pagar.tipo IS 'Tipo da conta: fixa, variavel ou pecas';
COMMENT ON COLUMN contas_pagar.status IS 'Status da conta: pendente, pago ou vencido';
COMMENT ON COLUMN contas_pagar.os_id IS 'ID da ordem de serviço (quando for peça)';
COMMENT ON COLUMN contas_pagar.peca_nome IS 'Nome da peça (quando tipo for pecas)';
COMMENT ON COLUMN contas_pagar.peca_quantidade IS 'Quantidade da peça';

-- =====================================================
-- 12. EXEMPLO DE USO
-- =====================================================

-- Para inserir categorias padrão em uma empresa específica:
-- SELECT inserir_categorias_padrao('uuid-da-empresa');

-- Para buscar contas de um período:
-- SELECT * FROM buscar_contas_por_periodo('uuid-da-empresa', '2024-01-01', '2024-12-31', 'pendente');

-- Para marcar uma conta como paga:
-- SELECT marcar_conta_como_paga('uuid-da-conta');

-- Para ver resumo financeiro:
-- SELECT * FROM view_resumo_financeiro WHERE empresa_id = 'uuid-da-empresa';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Contas a Pagar criado com sucesso!';
    RAISE NOTICE '📋 Tabelas criadas: categorias_contas, contas_pagar';
    RAISE NOTICE '🔒 RLS configurado para segurança por empresa';
    RAISE NOTICE '📊 Views e funções utilitárias criadas';
    RAISE NOTICE '🎯 Execute: SELECT inserir_categorias_padrao(''uuid-da-empresa''); para inserir categorias padrão';
END $$;
