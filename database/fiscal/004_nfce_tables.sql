-- NFC-e tables + endereço do emitente
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS end_logradouro text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS end_numero text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS end_complemento text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS end_bairro text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS end_cep text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS end_fone text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS nfce_ncm_padrao varchar(8);
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS nfce_cfop_padrao varchar(4);
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS nfce_csosn_padrao varchar(3);
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS resp_tec_cnpj text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS resp_tec_contato text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS resp_tec_email text;
ALTER TABLE fiscal_empresa_config ADD COLUMN IF NOT EXISTS resp_tec_fone text;

CREATE TABLE IF NOT EXISTS fiscal_nfce_counters (
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  serie varchar(3) NOT NULL DEFAULT '1',
  ultimo_numero bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, serie)
);

CREATE TABLE IF NOT EXISTS fiscal_nfce (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  chave_acesso char(44) NOT NULL,
  numero integer NOT NULL,
  serie varchar(3) NOT NULL,
  status text NOT NULL DEFAULT 'autorizada',
  tipo_ambiente smallint NOT NULL,
  protocolo text,
  xml_nfce text,
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

CREATE INDEX IF NOT EXISTS idx_fiscal_nfce_empresa_dh ON fiscal_nfce (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfce_os ON fiscal_nfce (ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfce_venda ON fiscal_nfce (venda_id);

ALTER TABLE fiscal_nfce_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfce ENABLE ROW LEVEL SECURITY;
GRANT ALL ON fiscal_nfce_counters TO service_role;
GRANT ALL ON fiscal_nfce TO service_role;
GRANT SELECT ON fiscal_nfce TO authenticated;
