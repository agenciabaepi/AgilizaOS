-- Cache de consultas de informações de aparelhos via IA
-- Evita chamadas repetidas à API do OpenAI para o mesmo aparelho

CREATE TABLE IF NOT EXISTS public.aparelhos_info_ia_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(150) NOT NULL,
  tipo VARCHAR(50),
  imagem_url TEXT,
  preco_min NUMERIC,
  preco_max NUMERIC,
  especificacoes JSONB NOT NULL DEFAULT '{}',
  descricao TEXT,
  ano_lancamento VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aparelhos_info_ia_cache_marca_modelo_unique UNIQUE (marca, modelo)
);

CREATE INDEX IF NOT EXISTS idx_aparelhos_info_ia_cache_marca_modelo
  ON public.aparelhos_info_ia_cache (LOWER(marca), LOWER(modelo));

ALTER TABLE public.aparelhos_info_ia_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'aparelhos_info_ia_cache'
      AND policyname = 'Authenticated users can read IA cache'
  ) THEN
    CREATE POLICY "Authenticated users can read IA cache"
      ON public.aparelhos_info_ia_cache FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
