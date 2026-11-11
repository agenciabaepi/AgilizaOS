-- Campos fiscais para cliente PJ (NF-e destinatário)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS ie_indicador text DEFAULT 'nao_contribuinte',
  ADD COLUMN IF NOT EXISTS inscricao_municipal text;

COMMENT ON COLUMN public.clientes.inscricao_estadual IS 'IE do destinatário (NF-e). Obrigatória se ie_indicador=contribuinte';
COMMENT ON COLUMN public.clientes.ie_indicador IS 'contribuinte | isento | nao_contribuinte (indIEDest 1/2/9)';
COMMENT ON COLUMN public.clientes.inscricao_municipal IS 'Inscrição municipal (opcional)';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_ie_indicador_check'
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_ie_indicador_check
      CHECK (ie_indicador IS NULL OR ie_indicador IN ('contribuinte','isento','nao_contribuinte'));
  END IF;
END $$;
