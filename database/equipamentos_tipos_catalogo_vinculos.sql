-- PASSO 2: Rode DEPOIS do passo 1 (adiciona colunas tipo_id e vínculos)
-- Se algum ALTER falhar, a tabela do passo 1 já existe e o app funciona.

ALTER TABLE public.equipamentos_tipos
  ADD COLUMN IF NOT EXISTS catalogo_id UUID REFERENCES public.equipamentos_tipos_catalogo(id) ON DELETE SET NULL;

ALTER TABLE public.equipamentos_tipos
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);

ALTER TABLE public.aparelhos_catalogo
  ADD COLUMN IF NOT EXISTS tipo_id UUID REFERENCES public.equipamentos_tipos_catalogo(id) ON DELETE SET NULL;

ALTER TABLE public.aparelhos_empresa
  ADD COLUMN IF NOT EXISTS tipo_id UUID REFERENCES public.equipamentos_tipos_catalogo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equipamentos_tipos_catalogo_id ON public.equipamentos_tipos(catalogo_id);
CREATE INDEX IF NOT EXISTS idx_aparelhos_catalogo_tipo_id ON public.aparelhos_catalogo(tipo_id);
CREATE INDEX IF NOT EXISTS idx_aparelhos_empresa_tipo_id ON public.aparelhos_empresa(tipo_id);

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

UPDATE public.equipamentos_tipos et
SET codigo = upper(trim(et.nome))
WHERE et.codigo IS NULL OR et.codigo = '';

UPDATE public.equipamentos_tipos et
SET catalogo_id = etc.id
FROM public.equipamentos_tipos_catalogo etc
WHERE et.catalogo_id IS NULL
  AND upper(trim(et.nome)) = etc.codigo;
