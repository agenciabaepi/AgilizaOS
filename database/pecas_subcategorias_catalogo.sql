-- Terceiro nível do catálogo de peças: subcategorias
-- Ex.: Telas → iPhone → OLED / Incell / LCD
-- Execute após database/pecas_catalogo.sql

CREATE TABLE IF NOT EXISTS public.pecas_subcategorias_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.pecas_categorias_catalogo(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  ordem INT NOT NULL DEFAULT 100,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pecas_subcategorias_catalogo_cat_nome_unique UNIQUE (categoria_id, nome),
  CONSTRAINT pecas_subcategorias_catalogo_cat_slug_unique UNIQUE (categoria_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pecas_subcategorias_catalogo_categoria
  ON public.pecas_subcategorias_catalogo(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pecas_subcategorias_catalogo_ativo
  ON public.pecas_subcategorias_catalogo(ativo);

ALTER TABLE public.pecas_catalogo
  ADD COLUMN IF NOT EXISTS subcategoria_id UUID
    REFERENCES public.pecas_subcategorias_catalogo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_subcategoria
  ON public.pecas_catalogo(subcategoria_id);

ALTER TABLE public.pecas_subcategorias_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pecas_subcategorias_catalogo_select_public" ON public.pecas_subcategorias_catalogo;
CREATE POLICY "pecas_subcategorias_catalogo_select_public"
  ON public.pecas_subcategorias_catalogo FOR SELECT
  USING (ativo = true);
