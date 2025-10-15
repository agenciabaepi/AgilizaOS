-- Tabela para movimentações de fluxo de caixa manual
CREATE TABLE IF NOT EXISTS fluxo_caixa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria VARCHAR(50) NOT NULL, -- 'venda', 'recebimento', 'despesa', 'investimento', 'emprestimo', 'outros'
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_movimentacao DATE NOT NULL,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observacoes TEXT,
  comprovante_url TEXT, -- URL para comprovante/documento
  referencia_id UUID, -- ID de referência (venda_id, conta_pagar_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_empresa_id ON fluxo_caixa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_data_movimentacao ON fluxo_caixa(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo ON fluxo_caixa(tipo);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_categoria ON fluxo_caixa(categoria);

-- RLS (Row Level Security)
ALTER TABLE fluxo_caixa ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso apenas aos dados da própria empresa
CREATE POLICY "Users can view fluxo_caixa from their own company" ON fluxo_caixa
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fluxo_caixa for their own company" ON fluxo_caixa
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update fluxo_caixa from their own company" ON fluxo_caixa
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete fluxo_caixa from their own company" ON fluxo_caixa
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fluxo_caixa_updated_at 
  BEFORE UPDATE ON fluxo_caixa 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
