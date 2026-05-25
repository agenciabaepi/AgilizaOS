-- Setup completo: cores + imagens por cor (rode ESTE arquivo de uma vez)
-- Ordem: cores_catalogo → aparelhos_catalogo_cores → coluna na OS

-- ========== 1) Tabela de cores ==========
CREATE TABLE IF NOT EXISTS public.cores_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  hex VARCHAR(7),
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cores_catalogo_nome_unique UNIQUE (nome)
);

CREATE INDEX IF NOT EXISTS idx_cores_catalogo_ativo ON public.cores_catalogo(ativo);
CREATE INDEX IF NOT EXISTS idx_cores_catalogo_ordem ON public.cores_catalogo(ordem);

ALTER TABLE public.cores_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cores_catalogo_select_authenticated" ON public.cores_catalogo;
CREATE POLICY "cores_catalogo_select_authenticated"
  ON public.cores_catalogo FOR SELECT TO authenticated
  USING (ativo = true);

INSERT INTO public.cores_catalogo (nome, hex, ordem) VALUES
  ('PRETO', '#1a1a1a', 10),
  ('BRANCO', '#f5f5f5', 20),
  ('PRATA', '#c0c0c0', 30),
  ('CINZA', '#808080', 40),
  ('AZUL', '#2563eb', 50),
  ('VERMELHO', '#dc2626', 60),
  ('VERDE', '#16a34a', 70),
  ('ROXO', '#7c3aed', 80),
  ('ROSA', '#ec4899', 90),
  ('DOURADO', '#ca8a04', 100),
  ('LARANJA', '#ea580c', 110),
  ('AMARELO', '#eab308', 120),
  ('MARROM', '#78350f', 130),
  ('AZUL CLARO', '#38bdf8', 140),
  ('VERDE CLARO', '#4ade80', 150),
  ('OUTRO', NULL, 999)
ON CONFLICT ON CONSTRAINT cores_catalogo_nome_unique DO NOTHING;

-- ========== 2) Imagens por cor no aparelho ==========
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

-- ========== 3) Snapshot na OS ==========
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS aparelho_cor_catalogo_id UUID;
