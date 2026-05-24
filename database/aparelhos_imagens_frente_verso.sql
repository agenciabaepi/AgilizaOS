-- Imagens frente e verso do aparelho (catálogo, empresa e snapshot na OS)
-- Execute no Supabase SQL Editor após aparelhos_catalogo.sql

ALTER TABLE public.aparelhos_catalogo
  ADD COLUMN IF NOT EXISTS imagem_frente_url TEXT,
  ADD COLUMN IF NOT EXISTS imagem_verso_url TEXT;

ALTER TABLE public.aparelhos_empresa
  ADD COLUMN IF NOT EXISTS imagem_frente_url TEXT,
  ADD COLUMN IF NOT EXISTS imagem_verso_url TEXT;

-- Migrar imagem única legada para frente
UPDATE public.aparelhos_catalogo
SET imagem_frente_url = imagem_url
WHERE imagem_frente_url IS NULL AND imagem_url IS NOT NULL;

UPDATE public.aparelhos_empresa
SET imagem_frente_url = imagem_url
WHERE imagem_frente_url IS NULL AND imagem_url IS NOT NULL;

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS aparelho_imagem_frente_url TEXT,
  ADD COLUMN IF NOT EXISTS aparelho_imagem_verso_url TEXT;

UPDATE public.ordens_servico
SET aparelho_imagem_frente_url = aparelho_imagem_url
WHERE aparelho_imagem_frente_url IS NULL AND aparelho_imagem_url IS NOT NULL;
