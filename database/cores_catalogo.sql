-- Catálogo global de cores (admin SaaS + seleção na Nova OS)
-- Execute ANTES de aparelhos_catalogo_cores.sql
-- Ou rode tudo de uma vez: database/setup_cores_aparelhos.sql

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
