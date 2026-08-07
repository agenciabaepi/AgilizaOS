-- Catálogo global de peças para venda (admin SaaS + página pública /pecas)
-- Execute no Supabase SQL Editor.

-- =============================================================================
-- Grupos (ex.: Telas, Baterias, Conectores)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pecas_grupos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  descricao TEXT,
  icone VARCHAR(40),
  imagem_url TEXT,
  cor VARCHAR(7),
  ordem INT NOT NULL DEFAULT 100,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pecas_grupos_catalogo_nome_unique UNIQUE (nome),
  CONSTRAINT pecas_grupos_catalogo_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_pecas_grupos_catalogo_ativo
  ON public.pecas_grupos_catalogo(ativo);
CREATE INDEX IF NOT EXISTS idx_pecas_grupos_catalogo_ordem
  ON public.pecas_grupos_catalogo(ordem);

-- =============================================================================
-- Categorias dentro do grupo (ex.: iPhone, Samsung dentro de Telas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pecas_categorias_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.pecas_grupos_catalogo(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  imagem_url TEXT,
  ordem INT NOT NULL DEFAULT 100,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pecas_categorias_catalogo_grupo_nome_unique UNIQUE (grupo_id, nome),
  CONSTRAINT pecas_categorias_catalogo_grupo_slug_unique UNIQUE (grupo_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pecas_categorias_catalogo_grupo
  ON public.pecas_categorias_catalogo(grupo_id);
CREATE INDEX IF NOT EXISTS idx_pecas_categorias_catalogo_ativo
  ON public.pecas_categorias_catalogo(ativo);

-- =============================================================================
-- Subcategorias dentro da categoria (ex.: OLED, Incell, LCD dentro de iPhone)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pecas_subcategorias_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.pecas_categorias_catalogo(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  ordem INT NOT NULL DEFAULT 100,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pecas_subcategorias_catalogo_cat_nome_unique UNIQUE (categoria_id, nome),
  CONSTRAINT pecas_subcategorias_catalogo_cat_slug_unique UNIQUE (categoria_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pecas_subcategorias_catalogo_categoria
  ON public.pecas_subcategorias_catalogo(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pecas_subcategorias_catalogo_ativo
  ON public.pecas_subcategorias_catalogo(ativo);

-- =============================================================================
-- Peças
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pecas_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.pecas_grupos_catalogo(id) ON DELETE RESTRICT,
  categoria_id UUID REFERENCES public.pecas_categorias_catalogo(id) ON DELETE SET NULL,
  subcategoria_id UUID REFERENCES public.pecas_subcategorias_catalogo(id) ON DELETE SET NULL,
  codigo VARCHAR(60),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  marca VARCHAR(120),
  modelo_compativel VARCHAR(255),
  preco NUMERIC(12, 2) NOT NULL DEFAULT 0,
  custo NUMERIC(12, 2),
  estoque INT NOT NULL DEFAULT 0,
  estoque_min INT NOT NULL DEFAULT 0,
  unidade VARCHAR(20) NOT NULL DEFAULT 'UN',
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  destaque BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_grupo
  ON public.pecas_catalogo(grupo_id);
CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_categoria
  ON public.pecas_catalogo(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_subcategoria
  ON public.pecas_catalogo(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_ativo
  ON public.pecas_catalogo(ativo);
CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_estoque
  ON public.pecas_catalogo(estoque);
CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_codigo
  ON public.pecas_catalogo(codigo);

-- =============================================================================
-- RLS: leitura pública apenas de itens ativos (escrita via service role / admin)
-- =============================================================================
ALTER TABLE public.pecas_grupos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecas_categorias_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecas_subcategorias_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecas_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pecas_grupos_catalogo_select_public" ON public.pecas_grupos_catalogo;
CREATE POLICY "pecas_grupos_catalogo_select_public"
  ON public.pecas_grupos_catalogo FOR SELECT
  USING (ativo = true);

DROP POLICY IF EXISTS "pecas_categorias_catalogo_select_public" ON public.pecas_categorias_catalogo;
CREATE POLICY "pecas_categorias_catalogo_select_public"
  ON public.pecas_categorias_catalogo FOR SELECT
  USING (ativo = true);

DROP POLICY IF EXISTS "pecas_subcategorias_catalogo_select_public" ON public.pecas_subcategorias_catalogo;
CREATE POLICY "pecas_subcategorias_catalogo_select_public"
  ON public.pecas_subcategorias_catalogo FOR SELECT
  USING (ativo = true);

DROP POLICY IF EXISTS "pecas_catalogo_select_public" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_select_public"
  ON public.pecas_catalogo FOR SELECT
  USING (ativo = true AND estoque > 0);

-- =============================================================================
-- Seed grupos iniciais
-- =============================================================================
INSERT INTO public.pecas_grupos_catalogo (nome, slug, icone, ordem) VALUES
  ('Telas', 'telas', 'smartphone', 10),
  ('Baterias', 'baterias', 'battery', 20),
  ('Conectores', 'conectores', 'plug', 30),
  ('Tampas traseiras', 'tampas-traseiras', 'square', 40),
  ('Câmeras', 'cameras', 'camera', 50),
  ('Flex', 'flex', 'cpu', 60),
  ('Alto-falantes', 'alto-falantes', 'volume', 70),
  ('Botões', 'botoes', 'circle', 80)
ON CONFLICT ON CONSTRAINT pecas_grupos_catalogo_slug_unique DO NOTHING;
