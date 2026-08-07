-- Fornecedores / marcas de peça (ex.: Soft OLED, JK, Incell Premium)
-- Independente da marca do aparelho (iPhone, Samsung…).
-- Execute no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.pecas_fornecedores_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  imagem_url TEXT,
  ordem INT NOT NULL DEFAULT 100,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pecas_fornecedores_catalogo_nome_unique UNIQUE (nome),
  CONSTRAINT pecas_fornecedores_catalogo_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_pecas_fornecedores_catalogo_ativo
  ON public.pecas_fornecedores_catalogo(ativo);
CREATE INDEX IF NOT EXISTS idx_pecas_fornecedores_catalogo_ordem
  ON public.pecas_fornecedores_catalogo(ordem);

ALTER TABLE public.pecas_catalogo
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID
    REFERENCES public.pecas_fornecedores_catalogo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_fornecedor
  ON public.pecas_catalogo(fornecedor_id);

ALTER TABLE public.pecas_fornecedores_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pecas_fornecedores_catalogo_select_public" ON public.pecas_fornecedores_catalogo;
CREATE POLICY "pecas_fornecedores_catalogo_select_public"
  ON public.pecas_fornecedores_catalogo FOR SELECT
  USING (ativo = true);
