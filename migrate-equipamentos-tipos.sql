-- Criar tabela de tipos de equipamentos
CREATE TABLE IF NOT EXISTS equipamentos_tipos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  quantidade_cadastrada INTEGER DEFAULT 0,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para performance
  CONSTRAINT unique_equipamento_empresa UNIQUE(nome, empresa_id)
);

-- Comentários para documentação
COMMENT ON TABLE equipamentos_tipos IS 'Tabela para armazenar tipos de equipamentos pré-cadastrados por empresa';
COMMENT ON COLUMN equipamentos_tipos.nome IS 'Nome do tipo de equipamento (ex: iPhone 14, Samsung Galaxy S23)';
COMMENT ON COLUMN equipamentos_tipos.categoria IS 'Categoria do equipamento (ex: Smartphone, Notebook, Tablet)';
COMMENT ON COLUMN equipamentos_tipos.descricao IS 'Descrição opcional do equipamento';
COMMENT ON COLUMN equipamentos_tipos.ativo IS 'Se o equipamento está ativo para seleção';
COMMENT ON COLUMN equipamentos_tipos.quantidade_cadastrada IS 'Quantidade de vezes que este equipamento foi usado em OS';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_empresa ON equipamentos_tipos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_ativo ON equipamentos_tipos(ativo);
CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_categoria ON equipamentos_tipos(categoria);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_equipamentos_tipos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_equipamentos_tipos_updated_at
  BEFORE UPDATE ON equipamentos_tipos
  FOR EACH ROW
  EXECUTE FUNCTION update_equipamentos_tipos_updated_at();

-- Inserir tipos de equipamentos padrão
INSERT INTO equipamentos_tipos (nome, categoria, descricao, empresa_id) 
SELECT 
  'CELULAR',
  'CELULAR',
  'Telefone celular/smartphone',
  id
FROM empresas 
WHERE id IS NOT NULL
ON CONFLICT (nome, empresa_id) DO NOTHING;

INSERT INTO equipamentos_tipos (nome, categoria, descricao, empresa_id) 
SELECT 
  'COMPUTADOR',
  'COMPUTADOR',
  'Computador desktop',
  id
FROM empresas 
WHERE id IS NOT NULL
ON CONFLICT (nome, empresa_id) DO NOTHING;

INSERT INTO equipamentos_tipos (nome, categoria, descricao, empresa_id) 
SELECT 
  'NOTEBOOK',
  'NOTEBOOK',
  'Notebook/laptop',
  id
FROM empresas 
WHERE id IS NOT NULL
ON CONFLICT (nome, empresa_id) DO NOTHING;

INSERT INTO equipamentos_tipos (nome, categoria, descricao, empresa_id) 
SELECT 
  'TABLET',
  'TABLET',
  'Tablet/iPad',
  id
FROM empresas 
WHERE id IS NOT NULL
ON CONFLICT (nome, empresa_id) DO NOTHING;

INSERT INTO equipamentos_tipos (nome, categoria, descricao, empresa_id) 
SELECT 
  'IMPRESSORA',
  'IMPRESSORA',
  'Impressora',
  id
FROM empresas 
WHERE id IS NOT NULL
ON CONFLICT (nome, empresa_id) DO NOTHING;

INSERT INTO equipamentos_tipos (nome, categoria, descricao, empresa_id) 
SELECT 
  'CAIXA DE SOM',
  'CAIXA DE SOM',
  'Caixa de som/alto-falante',
  id
FROM empresas 
WHERE id IS NOT NULL
ON CONFLICT (nome, empresa_id) DO NOTHING;

INSERT INTO equipamentos_tipos (nome, categoria, descricao, empresa_id) 
SELECT 
  'RELÓGIO',
  'RELÓGIO',
  'Relógio inteligente/smartwatch',
  id
FROM empresas 
WHERE id IS NOT NULL
ON CONFLICT (nome, empresa_id) DO NOTHING;

INSERT INTO equipamentos_tipos (nome, categoria, descricao, empresa_id) 
SELECT 
  'MONITOR',
  'MONITOR',
  'Monitor de computador',
  id
FROM empresas 
WHERE id IS NOT NULL
ON CONFLICT (nome, empresa_id) DO NOTHING;
