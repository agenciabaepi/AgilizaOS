-- Tabela de códigos de verificação de e-mail (cadastro / primeiro login)
CREATE TABLE IF NOT EXISTS public.codigo_verificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  email TEXT NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT false,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_codigo_verificacao_usuario_usado
  ON public.codigo_verificacao (usuario_id, usado);

CREATE INDEX IF NOT EXISTS idx_codigo_verificacao_email_codigo
  ON public.codigo_verificacao (email, codigo)
  WHERE usado = false;
