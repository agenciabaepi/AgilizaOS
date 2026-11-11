-- NFC-e (modelo 65) — configuração por empresa (SEFAZ-SP)
ALTER TABLE fiscal_empresa_config
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS uf char(2) DEFAULT 'SP',
  ADD COLUMN IF NOT EXISTS nfce_serie varchar(3) DEFAULT '1',
  ADD COLUMN IF NOT EXISTS nfce_id_csc varchar(6),
  ADD COLUMN IF NOT EXISTS nfce_csc text,
  ADD COLUMN IF NOT EXISTS nfce_ativo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN fiscal_empresa_config.inscricao_estadual IS 'IE do emitente (CADESP) — obrigatória para NFC-e';
COMMENT ON COLUMN fiscal_empresa_config.nfce_id_csc IS 'ID do CSC no portal SEFAZ (ex.: 000001)';
COMMENT ON COLUMN fiscal_empresa_config.nfce_csc IS 'Token CSC (Código de Segurança do Contribuinte)';
COMMENT ON COLUMN fiscal_empresa_config.nfce_serie IS 'Série da NFC-e (modelo 65)';
COMMENT ON COLUMN fiscal_empresa_config.nfce_ativo IS 'Habilita emissão de NFC-e quando CSC/IE estiverem ok';
