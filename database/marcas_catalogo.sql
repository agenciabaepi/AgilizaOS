-- Marcas do catálogo global (admin SaaS → aparelhos)
-- Execute após aparelhos_catalogo.sql

CREATE TABLE IF NOT EXISTS public.marcas_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marcas_catalogo_nome_unique UNIQUE (nome)
);

CREATE INDEX IF NOT EXISTS idx_marcas_catalogo_ativo ON public.marcas_catalogo(ativo);
CREATE INDEX IF NOT EXISTS idx_marcas_catalogo_ordem ON public.marcas_catalogo(ordem);

ALTER TABLE public.marcas_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marcas_catalogo_select_authenticated" ON public.marcas_catalogo;
CREATE POLICY "marcas_catalogo_select_authenticated"
  ON public.marcas_catalogo FOR SELECT TO authenticated
  USING (ativo = true);

-- Marcas iniciais (ajuste ordem conforme necessário)
INSERT INTO public.marcas_catalogo (nome, ordem) VALUES
  ('APPLE', 10),
  ('SAMSUNG', 20),
  ('MOTOROLA', 30),
  ('XIAOMI', 40),
  ('LG', 50),
  ('HUAWEI', 60),
  ('ONEPLUS', 70),
  ('REALME', 80),
  ('ASUS', 90),
  ('GOOGLE', 100),
  ('NOKIA', 110),
  ('SONY', 120),
  ('OUTROS', 999)
ON CONFLICT ON CONSTRAINT marcas_catalogo_nome_unique DO NOTHING;
