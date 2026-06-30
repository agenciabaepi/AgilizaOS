-- Catálogo de marcas por empresa (produtos)
CREATE TABLE IF NOT EXISTS public.marcas_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marcas_produtos_empresa_nome_unique UNIQUE (empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_marcas_produtos_empresa_id ON public.marcas_produtos(empresa_id);

ALTER TABLE public.marcas_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marcas_produtos_select_authenticated" ON public.marcas_produtos;
CREATE POLICY "marcas_produtos_select_authenticated"
  ON public.marcas_produtos FOR SELECT TO authenticated
  USING (true);
