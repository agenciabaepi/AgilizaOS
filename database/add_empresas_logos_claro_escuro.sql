-- Adiciona logos claro e escuro na tabela empresas
-- logo_claro_url: para uso em fundos escuros (logo claro)
-- logo_escuro_url: para uso em fundos claros (logo escuro)

ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS logo_claro_url text,
ADD COLUMN IF NOT EXISTS logo_escuro_url text;

COMMENT ON COLUMN empresas.logo_claro_url IS 'Logo em versão clara (para uso sobre fundos escuros).';
COMMENT ON COLUMN empresas.logo_escuro_url IS 'Logo em versão escura (para uso sobre fundos claros).';

