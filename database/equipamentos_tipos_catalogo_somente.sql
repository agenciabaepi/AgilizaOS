-- PASSO 1: Rode ESTE arquivo primeiro (cria só a tabela de tipos globais)
-- Supabase → SQL Editor → New query → cole tudo → Run

CREATE TABLE IF NOT EXISTS public.equipamentos_tipos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT equipamentos_tipos_catalogo_codigo_unique UNIQUE (codigo)
);

ALTER TABLE public.equipamentos_tipos_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipamentos_tipos_catalogo_select_authenticated" ON public.equipamentos_tipos_catalogo;
CREATE POLICY "equipamentos_tipos_catalogo_select_authenticated"
  ON public.equipamentos_tipos_catalogo FOR SELECT TO authenticated
  USING (ativo = true);

CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_catalogo_ativo ON public.equipamentos_tipos_catalogo(ativo);
CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_catalogo_ordem ON public.equipamentos_tipos_catalogo(ordem);

INSERT INTO public.equipamentos_tipos_catalogo (codigo, nome, ordem, ativo) VALUES
  ('CELULAR', 'Celular', 10, true),
  ('NOTEBOOK', 'Notebook', 20, true),
  ('TABLET', 'Tablet', 30, true),
  ('SMARTWATCH', 'Smartwatch', 40, true),
  ('IMPRESSORA', 'Impressora', 50, true),
  ('MONITOR', 'Monitor', 60, true),
  ('TV', 'TV', 70, true),
  ('VIDEOGAME', 'Videogame', 80, true),
  ('CONSOLE', 'Console', 90, true),
  ('DESKTOP', 'Desktop', 100, true),
  ('OUTRO', 'Outro', 999, true)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  updated_at = now();

-- Confirme: deve retornar 11 linhas
SELECT count(*) AS tipos_cadastrados FROM public.equipamentos_tipos_catalogo;
