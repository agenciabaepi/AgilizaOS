-- Checklist global por tipo de equipamento (admin SaaS)
-- Execute após equipamentos_tipos_catalogo.sql

CREATE TABLE IF NOT EXISTS public.checklist_itens_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id UUID REFERENCES public.equipamentos_tipos_catalogo(id) ON DELETE CASCADE,
  equipamento_categoria VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) NOT NULL DEFAULT 'geral',
  ordem INT NOT NULL DEFAULT 0,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT checklist_itens_catalogo_tipo_nome_unique UNIQUE (tipo_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_checklist_itens_catalogo_tipo ON public.checklist_itens_catalogo(tipo_id);
CREATE INDEX IF NOT EXISTS idx_checklist_itens_catalogo_categoria ON public.checklist_itens_catalogo(equipamento_categoria);
CREATE INDEX IF NOT EXISTS idx_checklist_itens_catalogo_ativo ON public.checklist_itens_catalogo(ativo);

ALTER TABLE public.checklist_itens_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_itens_catalogo_select_authenticated" ON public.checklist_itens_catalogo;
CREATE POLICY "checklist_itens_catalogo_select_authenticated"
  ON public.checklist_itens_catalogo FOR SELECT TO authenticated
  USING (ativo = true);
