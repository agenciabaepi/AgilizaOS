-- NF-e modelo 55 (DANFE A4 padrão)
ALTER TABLE fiscal_empresa_config
  ADD COLUMN IF NOT EXISTS nfe_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nfe_serie varchar(3) DEFAULT '1';

COMMENT ON COLUMN fiscal_empresa_config.nfe_ativo IS 'Habilita emissão de NF-e (modelo 55) com DANFE A4';
COMMENT ON COLUMN fiscal_empresa_config.nfe_serie IS 'Série da NF-e (modelo 55)';

CREATE TABLE IF NOT EXISTS fiscal_nfe_counters (
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  serie varchar(3) NOT NULL DEFAULT '1',
  ultimo_numero bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, serie)
);

CREATE TABLE IF NOT EXISTS fiscal_nfe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  chave_acesso char(44) NOT NULL,
  numero integer NOT NULL,
  serie varchar(3) NOT NULL,
  status text NOT NULL DEFAULT 'autorizada',
  tipo_ambiente smallint NOT NULL,
  protocolo text,
  xml_nfe text,
  xml_prot text,
  valor_total numeric(12,2),
  ordem_servico_id uuid,
  venda_id uuid,
  emitido_por_usuario_id uuid,
  dh_emi timestamptz,
  dh_recbto timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, chave_acesso)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_empresa_dh ON fiscal_nfe (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_os ON fiscal_nfe (ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_venda ON fiscal_nfe (venda_id);

ALTER TABLE fiscal_nfe_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfe ENABLE ROW LEVEL SECURITY;

GRANT ALL ON fiscal_nfe_counters TO service_role;
GRANT ALL ON fiscal_nfe TO service_role;
GRANT SELECT ON fiscal_nfe TO authenticated;
