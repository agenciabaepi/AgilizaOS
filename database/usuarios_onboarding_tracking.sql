-- Rastreamento de primeiro login e verificação de e-mail (painel admin SaaS)

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS primeiro_login_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS email_verificado_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS verificacao_liberada_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificacao_liberada_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS verificacao_liberada_por TEXT NULL;

COMMENT ON COLUMN public.usuarios.primeiro_login_em IS
  'Data/hora do primeiro login bem-sucedido no sistema.';

COMMENT ON COLUMN public.usuarios.email_verificado_em IS
  'Data/hora em que o usuário confirmou o e-mail com código.';

COMMENT ON COLUMN public.usuarios.verificacao_liberada_admin IS
  'Admin liberou acesso sem código de verificação de e-mail.';

COMMENT ON COLUMN public.usuarios.verificacao_liberada_em IS
  'Quando o admin liberou verificação sem código.';

COMMENT ON COLUMN public.usuarios.verificacao_liberada_por IS
  'E-mail do admin que liberou verificação sem código.';
