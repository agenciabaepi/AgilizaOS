-- Catálogo público (loja online via WhatsApp)
-- Configuração por empresa + flag opcional nos produtos

ALTER TABLE public.configuracoes_empresa
  ADD COLUMN IF NOT EXISTS catalogo_loja_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalogo_loja_slug text,
  ADD COLUMN IF NOT EXISTS catalogo_loja_titulo text,
  ADD COLUMN IF NOT EXISTS catalogo_loja_descricao text,
  ADD COLUMN IF NOT EXISTS catalogo_loja_whatsapp text,
  ADD COLUMN IF NOT EXISTS catalogo_loja_cor text DEFAULT '#111111';

CREATE UNIQUE INDEX IF NOT EXISTS configuracoes_empresa_catalogo_loja_slug_unique
  ON public.configuracoes_empresa (lower(catalogo_loja_slug))
  WHERE catalogo_loja_slug IS NOT NULL AND btrim(catalogo_loja_slug) <> '';

COMMENT ON COLUMN public.configuracoes_empresa.catalogo_loja_habilitado IS 'Exibe o catálogo público em /catalogo/[slug]';
COMMENT ON COLUMN public.configuracoes_empresa.catalogo_loja_slug IS 'Slug público do catálogo (URL)';
COMMENT ON COLUMN public.configuracoes_empresa.catalogo_loja_whatsapp IS 'WhatsApp do catálogo; se vazio, usa empresas.telefone';

ALTER TABLE public.produtos_servicos
  ADD COLUMN IF NOT EXISTS mostrar_catalogo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.produtos_servicos.mostrar_catalogo IS 'Se true, item aparece no catálogo público da empresa';
