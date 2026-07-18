CREATE TABLE IF NOT EXISTS public.sms_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  proposito TEXT NOT NULL DEFAULT 'verificacao_cadastro',
  sms_id BIGINT,
  cost NUMERIC(10, 4),
  blocks_used INTEGER,
  sucesso BOOLEAN NOT NULL DEFAULT true,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_envios_created_at
  ON public.sms_envios (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_envios_proposito
  ON public.sms_envios (proposito, created_at DESC);

COMMENT ON TABLE public.sms_envios IS
  'Histórico de SMS enviados via BrasilSMS (custo por envio). Saldo restante só no painel BrasilSMS.';

-- Saldo local (API BrasilSMS não expõe saldo)
CREATE TABLE IF NOT EXISTS public.sms_saldo (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  saldo NUMERIC(12, 4) NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por TEXT,
  observacao TEXT
);

INSERT INTO public.sms_saldo (id, saldo, observacao)
VALUES (1, 0, 'Informe o saldo atual do painel BrasilSMS')
ON CONFLICT (id) DO NOTHING;