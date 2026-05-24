-- ⚠️ TERCEIRO ARQUIVO (obrigatório para tipos de equipamento + filtro de aparelhos)
-- Os outros dois são: aparelhos_catalogo.sql e aparelhos_storage.sql
--
-- Se der erro ao rodar tudo junto, use em ordem:
--   1) equipamentos_tipos_catalogo_somente.sql
--   2) equipamentos_tipos_catalogo_vinculos.sql
--
-- Catálogo global de tipos de equipamento (admin SaaS)

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

-- Vínculo opcional: tipo customizado da empresa → catálogo global
ALTER TABLE public.equipamentos_tipos
  ADD COLUMN IF NOT EXISTS catalogo_id UUID REFERENCES public.equipamentos_tipos_catalogo(id) ON DELETE SET NULL;

ALTER TABLE public.equipamentos_tipos
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);

-- Aparelhos: FK para tipo padronizado (mantém coluna tipo para compatibilidade)
ALTER TABLE public.aparelhos_catalogo
  ADD COLUMN IF NOT EXISTS tipo_id UUID REFERENCES public.equipamentos_tipos_catalogo(id) ON DELETE SET NULL;

ALTER TABLE public.aparelhos_empresa
  ADD COLUMN IF NOT EXISTS tipo_id UUID REFERENCES public.equipamentos_tipos_catalogo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_catalogo_ativo ON public.equipamentos_tipos_catalogo(ativo);
CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_catalogo_ordem ON public.equipamentos_tipos_catalogo(ordem);
CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_catalogo_id ON public.equipamentos_tipos(catalogo_id);
CREATE INDEX IF NOT EXISTS idx_aparelhos_catalogo_tipo_id ON public.aparelhos_catalogo(tipo_id);
CREATE INDEX IF NOT EXISTS idx_aparelhos_empresa_tipo_id ON public.aparelhos_empresa(tipo_id);

-- RLS catálogo global de tipos (leitura autenticada)
ALTER TABLE public.equipamentos_tipos_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipamentos_tipos_catalogo_select_authenticated" ON public.equipamentos_tipos_catalogo;
CREATE POLICY "equipamentos_tipos_catalogo_select_authenticated"
  ON public.equipamentos_tipos_catalogo FOR SELECT TO authenticated
  USING (ativo = true);

-- Seed tipos padrão Consert
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

-- Backfill tipo_id nos aparelhos existentes (match por coluna tipo)
UPDATE public.aparelhos_catalogo ac
SET tipo_id = etc.id
FROM public.equipamentos_tipos_catalogo etc
WHERE ac.tipo_id IS NULL
  AND upper(trim(ac.tipo)) = etc.codigo;

UPDATE public.aparelhos_empresa ae
SET tipo_id = etc.id
FROM public.equipamentos_tipos_catalogo etc
WHERE ae.tipo_id IS NULL
  AND upper(trim(ae.tipo)) = etc.codigo;

-- Backfill codigo em equipamentos_tipos da empresa
UPDATE public.equipamentos_tipos et
SET codigo = upper(trim(et.nome))
WHERE et.codigo IS NULL OR et.codigo = '';

UPDATE public.equipamentos_tipos et
SET catalogo_id = etc.id
FROM public.equipamentos_tipos_catalogo etc
WHERE et.catalogo_id IS NULL
  AND upper(trim(et.nome)) = etc.codigo;
