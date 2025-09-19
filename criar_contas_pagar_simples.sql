-- =====================================================
-- SCRIPT SIMPLES: SISTEMA DE CONTAS A PAGAR
-- =====================================================
-- Este script cria as tabelas necessárias para o sistema de contas a pagar
-- Baseado na estrutura existente do sistema

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para categorias_contas
CREATE INDEX IF NOT EXISTS idx_categorias_contas_empresa ON categorias_contas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_contas_tipo ON categorias_contas(tipo);
CREATE INDEX IF NOT EXISTS idx_categorias_contas_ativo ON categorias_contas(ativo);

-- Índices para contas_pagar
CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa ON contas_pagar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_categoria ON contas_pagar(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_os ON contas_pagar(os_id);

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
DO $$
BEGIN
    -- Política para SELECT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias_contas' AND policyname = 'usuarios_podem_ver_categorias_da_propria_empresa') THEN
        CREATE POLICY "usuarios_podem_ver_categorias_da_propria_empresa" 
            ON categorias_contas FOR SELECT 
            USING (empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
            ));
    END IF;
    
    -- Política para INSERT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias_contas' AND policyname = 'usuarios_podem_inserir_categorias_na_propria_empresa') THEN
        CREATE POLICY "usuarios_podem_inserir_categorias_na_propria_empresa" 
            ON categorias_contas FOR INSERT 
            WITH CHECK (empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
            ));
    END IF;
    
    -- Política para UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias_contas' AND policyname = 'usuarios_podem_atualizar_categorias_da_propria_empresa') THEN
        CREATE POLICY "usuarios_podem_atualizar_categorias_da_propria_empresa" 
            ON categorias_contas FOR UPDATE 
            USING (empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
            ));
    END IF;
    
    -- Política para DELETE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias_contas' AND policyname = 'usuarios_podem_deletar_categorias_da_propria_empresa') THEN
        CREATE POLICY "usuarios_podem_deletar_categorias_da_propria_empresa" 
            ON categorias_contas FOR DELETE 
            USING (empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
            ));
    END IF;
END $$;

-- Políticas para contas_pagar
DO $$
BEGIN
    -- Política para SELECT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contas_pagar' AND policyname = 'usuarios_podem_ver_contas_da_propria_empresa') THEN
        CREATE POLICY "usuarios_podem_ver_contas_da_propria_empresa" 
            ON contas_pagar FOR SELECT 
            USING (empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
            ));
    END IF;
    
    -- Política para INSERT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contas_pagar' AND policyname = 'usuarios_podem_inserir_contas_na_propria_empresa') THEN
        CREATE POLICY "usuarios_podem_inserir_contas_na_propria_empresa" 
            ON contas_pagar FOR INSERT 
            WITH CHECK (empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
            ));
    END IF;
    
    -- Política para UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contas_pagar' AND policyname = 'usuarios_podem_atualizar_contas_da_propria_empresa') THEN
        CREATE POLICY "usuarios_podem_atualizar_contas_da_propria_empresa" 
            ON contas_pagar FOR UPDATE 
            USING (empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
            ));
    END IF;
    
    -- Política para DELETE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contas_pagar' AND policyname = 'usuarios_podem_deletar_contas_da_propria_empresa') THEN
        CREATE POLICY "usuarios_podem_deletar_contas_da_propria_empresa" 
            ON contas_pagar FOR DELETE 
            USING (empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
            ));
    END IF;
END $$;

-- =====================================================
-- 6. INSERIR CATEGORIAS PADRÃO
-- =====================================================

-- Inserir categorias padrão para todas as empresas existentes
INSERT INTO categorias_contas (empresa_id, nome, tipo, cor, descricao)
SELECT 
    e.id as empresa_id,
    categoria.nome,
    categoria.tipo,
    categoria.cor,
    categoria.descricao
FROM empresas e
CROSS JOIN (
    VALUES 
    ('Aluguel', 'fixa', '#EF4444', 'Categoria padrão para aluguel'),
    ('Energia Elétrica', 'fixa', '#F59E0B', 'Categoria padrão para energia elétrica'),
    ('Água', 'fixa', '#3B82F6', 'Categoria padrão para água'),
    ('Internet', 'fixa', '#8B5CF6', 'Categoria padrão para internet'),
    ('Telefone', 'fixa', '#06B6D4', 'Categoria padrão para telefone'),
    ('Colaboradores', 'fixa', '#10B981', 'Categoria padrão para colaboradores'),
    ('Material de Escritório', 'variavel', '#6B7280', 'Categoria padrão para material de escritório'),
    ('Marketing', 'variavel', '#EC4899', 'Categoria padrão para marketing'),
    ('Manutenção', 'variavel', '#F97316', 'Categoria padrão para manutenção'),
    ('Peças', 'pecas', '#84CC16', 'Categoria padrão para peças'),
    ('Ferramentas', 'variavel', '#6366F1', 'Categoria padrão para ferramentas'),
    ('Outros', 'variavel', '#64748B', 'Categoria padrão para outros gastos')
) AS categoria(nome, tipo, cor, descricao)
ON CONFLICT (empresa_id, nome) DO NOTHING;

-- =====================================================
-- 7. COMENTÁRIOS DAS TABELAS
-- =====================================================

COMMENT ON TABLE categorias_contas IS 'Categorias para organizar as contas a pagar';
COMMENT ON TABLE contas_pagar IS 'Contas a pagar da empresa';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Contas a Pagar criado com sucesso!';
    RAISE NOTICE '📋 Tabelas criadas: categorias_contas, contas_pagar';
    RAISE NOTICE '🔒 RLS configurado para segurança por empresa';
    RAISE NOTICE '🏷️ Categorias padrão inseridas para todas as empresas';
END $$;
