-- Logo das marcas/categorias (ex.: iPhone, Samsung)
-- Execute no Supabase SQL Editor.

ALTER TABLE public.pecas_categorias_catalogo
  ADD COLUMN IF NOT EXISTS imagem_url TEXT;
