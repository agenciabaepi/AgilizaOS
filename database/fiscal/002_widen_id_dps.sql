-- id_dps pode vir com prefixo/tamanho > 45 no retorno SEFIN atual
ALTER TABLE fiscal_nfse ALTER COLUMN id_dps TYPE varchar(60);
ALTER TABLE fiscal_nfse_rejeicoes ALTER COLUMN id_dps TYPE varchar(60);
ALTER TABLE fiscal_nfse_pending ALTER COLUMN id_dps TYPE varchar(60);
