-- Tabela para tipos de conta customizáveis
CREATE TABLE IF NOT EXISTS tipos_conta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#6B7280', -- Cor em hex para exibição
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_conta_empresa_id ON tipos_conta(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipos_conta_ativo ON tipos_conta(ativo);

-- RLS (Row Level Security)
ALTER TABLE tipos_conta ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem ver tipos da sua empresa
CREATE POLICY "Usuários podem ver tipos da sua empresa" ON tipos_conta
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Política: usuários só podem inserir tipos para sua empresa
CREATE POLICY "Usuários podem inserir tipos para sua empresa" ON tipos_conta
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Política: usuários só podem atualizar tipos da sua empresa
CREATE POLICY "Usuários podem atualizar tipos da sua empresa" ON tipos_conta
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Política: usuários só podem deletar tipos da sua empresa
CREATE POLICY "Usuários podem deletar tipos da sua empresa" ON tipos_conta
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tipos_conta_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tipos_conta_updated_at
  BEFORE UPDATE ON tipos_conta
  FOR EACH ROW
  EXECUTE FUNCTION update_tipos_conta_updated_at();

-- Inserir tipos padrão para cada empresa existente
INSERT INTO tipos_conta (empresa_id, nome, descricao, cor)
SELECT 
  e.id,
  'Fornecedor',
  'Contas relacionadas a fornecedores e compras',
  '#3B82F6'
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM tipos_conta tc 
  WHERE tc.empresa_id = e.id AND tc.nome = 'Fornecedor'
);

INSERT INTO tipos_conta (empresa_id, nome, descricao, cor)
SELECT 
  e.id,
  'Energia',
  'Contas de energia elétrica',
  '#F59E0B'
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM tipos_conta tc 
  WHERE tc.empresa_id = e.id AND tc.nome = 'Energia'
);

INSERT INTO tipos_conta (empresa_id, nome, descricao, cor)
SELECT 
  e.id,
  'Água',
  'Contas de água e esgoto',
  '#06B6D4'
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM tipos_conta tc 
  WHERE tc.empresa_id = e.id AND tc.nome = 'Água'
);

INSERT INTO tipos_conta (empresa_id, nome, descricao, cor)
SELECT 
  e.id,
  'Internet',
  'Contas de internet e telefone',
  '#8B5CF6'
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM tipos_conta tc 
  WHERE tc.empresa_id = e.id AND tc.nome = 'Internet'
);
