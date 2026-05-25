-- Imagens por cor no catálogo global de aparelhos
-- ⚠️ ANTES deste arquivo, rode database/cores_catalogo.sql (ou use setup_cores_aparelhos.sql que faz tudo)
-- Pré-requisitos: aparelhos_catalogo.sql, cores_catalogo.sql, aparelhos_imagens_frente_verso.sql

CREATE TABLE IF NOT EXISTS public.aparelhos_catalogo_cores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aparelho_catalogo_id UUID NOT NULL REFERENCES public.aparelhos_catalogo(id) ON DELETE CASCADE,
  cor_id UUID NOT NULL REFERENCES public.cores_catalogo(id) ON DELETE RESTRICT,
  imagem_url TEXT,
  imagem_frente_url TEXT,
  imagem_verso_url TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aparelhos_catalogo_cores_aparelho_cor_unique UNIQUE (aparelho_catalogo_id, cor_id)
);

CREATE INDEX IF NOT EXISTS idx_aparelhos_catalogo_cores_aparelho
  ON public.aparelhos_catalogo_cores(aparelho_catalogo_id);
CREATE INDEX IF NOT EXISTS idx_aparelhos_catalogo_cores_cor
  ON public.aparelhos_catalogo_cores(cor_id);
CREATE INDEX IF NOT EXISTS idx_aparelhos_catalogo_cores_ativo
  ON public.aparelhos_catalogo_cores(aparelho_catalogo_id, ativo);

ALTER TABLE public.aparelhos_catalogo_cores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aparelhos_catalogo_cores_select_authenticated" ON public.aparelhos_catalogo_cores;
CREATE POLICY "aparelhos_catalogo_cores_select_authenticated"
  ON public.aparelhos_catalogo_cores FOR SELECT TO authenticated
  USING (ativo = true);

-- Snapshot opcional na OS
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS aparelho_cor_catalogo_id UUID;
