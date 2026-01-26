-- Adiciona coluna link_publico_ativo na tabela empresas
-- Quando false: oculta senha de acesso, botão Ver Status, QR code nas impressões e páginas /os/[id]/status e /os/[id]/login

ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS link_publico_ativo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN empresas.link_publico_ativo IS 'Se true, exibe e permite uso do link público (senha, QR code, Ver Status, /os/[id]/status e /os/[id]/login). Se false, oculta tudo relacionado.';
