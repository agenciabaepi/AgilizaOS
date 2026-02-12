-- Tabela de pagamentos (PIX/Asaas) por empresa
-- Execute no Supabase SQL Editor se a tabela ainda não existir.

CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mercadopago_payment_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  valor DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(mercadopago_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa_id ON pagamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_created_at ON pagamentos(created_at DESC);

-- RLS: apenas o service role (API) acessa; usuários veem via API autenticada
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access pagamentos"
  ON pagamentos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE pagamentos IS 'Pagamentos PIX/Asaas da assinatura por empresa';
