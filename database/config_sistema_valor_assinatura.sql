-- Tabela de configurações do sistema (valor da assinatura, etc.)
-- Execute no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS config_sistema (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir valor padrão da assinatura (R$ 119,90 mensal)
INSERT INTO config_sistema (chave, valor)
VALUES ('valor_assinatura_mensal', '119.90')
ON CONFLICT (chave) DO NOTHING;

-- RLS: apenas service_role pode acessar
ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access config_sistema"
  ON config_sistema FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE config_sistema IS 'Configurações globais do sistema (valor assinatura, etc.)';
