-- Saldo local de créditos SMS (BrasilSMS não expõe saldo via API).
-- O admin informa o valor do painel; cada envio bem-sucedido desconta o cost.

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

COMMENT ON TABLE public.sms_saldo IS
  'Saldo de crédito SMS espelhado do painel BrasilSMS (atualização manual + desconto automático por envio).';
