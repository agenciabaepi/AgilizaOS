-- Catálogo global de aparelhos (admin-saas) e aparelhos por empresa
-- Execute no Supabase SQL Editor ou via migration

-- Catálogo global (disponível para todos os usuários)
CREATE TABLE IF NOT EXISTS public.aparelhos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL DEFAULT 'CELULAR',
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(150) NOT NULL,
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aparelhos_catalogo_marca_modelo_unique UNIQUE (marca, modelo)
);

-- Aparelhos cadastrados pela empresa
CREATE TABLE IF NOT EXISTS public.aparelhos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'CELULAR',
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(150) NOT NULL,
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aparelhos_empresa_empresa_marca_modelo_unique UNIQUE (empresa_id, marca, modelo)
);

-- Rastreabilidade na OS (snapshot da imagem no momento da criação)
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS aparelho_origem TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS aparelho_catalogo_id UUID;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS aparelho_empresa_id UUID;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS aparelho_imagem_url TEXT;

CREATE INDEX IF NOT EXISTS idx_aparelhos_catalogo_ativo ON public.aparelhos_catalogo(ativo);
CREATE INDEX IF NOT EXISTS idx_aparelhos_catalogo_tipo ON public.aparelhos_catalogo(tipo);
CREATE INDEX IF NOT EXISTS idx_aparelhos_empresa_empresa_id ON public.aparelhos_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_aparelhos_empresa_ativo ON public.aparelhos_empresa(empresa_id, ativo);

-- RLS
ALTER TABLE public.aparelhos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aparelhos_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aparelhos_catalogo_select_authenticated" ON public.aparelhos_catalogo;
CREATE POLICY "aparelhos_catalogo_select_authenticated"
  ON public.aparelhos_catalogo FOR SELECT TO authenticated
  USING (ativo = true);

DROP POLICY IF EXISTS "aparelhos_empresa_select_empresa" ON public.aparelhos_empresa;
CREATE POLICY "aparelhos_empresa_select_empresa"
  ON public.aparelhos_empresa FOR SELECT TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "aparelhos_empresa_insert_empresa" ON public.aparelhos_empresa;
CREATE POLICY "aparelhos_empresa_insert_empresa"
  ON public.aparelhos_empresa FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "aparelhos_empresa_update_empresa" ON public.aparelhos_empresa;
CREATE POLICY "aparelhos_empresa_update_empresa"
  ON public.aparelhos_empresa FOR UPDATE TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "aparelhos_empresa_delete_empresa" ON public.aparelhos_empresa;
CREATE POLICY "aparelhos_empresa_delete_empresa"
  ON public.aparelhos_empresa FOR DELETE TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Bucket de storage: execute database/aparelhos_storage.sql no Supabase SQL Editor
-- Tipos de equipamento globais: execute database/equipamentos_tipos_catalogo.sql
-- Imagens frente/verso: execute database/aparelhos_imagens_frente_verso.sql
-- Marcas (abas no admin): execute database/marcas_catalogo.sql
-- Cores + imagens por cor: execute database/cores_catalogo.sql e database/aparelhos_catalogo_cores.sql
