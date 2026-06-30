-- Cupons de desconto (uso único global por cupom)
-- Execute no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS cupons_desconto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  percentual INTEGER NOT NULL CHECK (percentual >= 1 AND percentual <= 100),
  ativo BOOLEAN NOT NULL DEFAULT true,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cupons_desconto_codigo_unique
  ON cupons_desconto (upper(trim(codigo)));

CREATE TABLE IF NOT EXISTS cupons_uso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cupom_id UUID NOT NULL REFERENCES cupons_desconto(id) ON DELETE RESTRICT,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  pagamento_id UUID REFERENCES pagamentos(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('reservado', 'confirmado', 'cancelado')),
  valor_original NUMERIC(10, 2) NOT NULL,
  valor_desconto NUMERIC(10, 2) NOT NULL,
  valor_final NUMERIC(10, 2) NOT NULL,
  reservado_ate TIMESTAMPTZ,
  confirmado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Um cupom só pode ter uma reserva ativa ou um uso confirmado
CREATE UNIQUE INDEX IF NOT EXISTS cupons_uso_cupom_ativo_unique
  ON cupons_uso (cupom_id)
  WHERE status IN ('reservado', 'confirmado');

CREATE INDEX IF NOT EXISTS idx_cupons_uso_empresa ON cupons_uso (empresa_id);
CREATE INDEX IF NOT EXISTS idx_cupons_uso_status ON cupons_uso (status);

ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS cupom_uso_id UUID REFERENCES cupons_uso(id);
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS valor_original NUMERIC(10, 2);

ALTER TABLE cupons_desconto ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupons_uso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role cupons_desconto" ON cupons_desconto FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role cupons_uso" ON cupons_uso FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Remove reservas expiradas (PIX não pago)
CREATE OR REPLACE FUNCTION public.limpar_cupons_reserva_expirada()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE cupons_uso
  SET status = 'cancelado'
  WHERE status = 'reservado'
    AND reservado_ate IS NOT NULL
    AND reservado_ate < NOW();
$$;

-- Validação sem reservar (preview na UI)
CREATE OR REPLACE FUNCTION public.validar_cupom_desconto(
  p_codigo TEXT,
  p_valor_original NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cupom cupons_desconto%ROWTYPE;
  v_desconto NUMERIC;
  v_final NUMERIC;
BEGIN
  PERFORM limpar_cupons_reserva_expirada();

  IF p_valor_original IS NULL OR p_valor_original <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Valor do plano inválido');
  END IF;

  SELECT * INTO v_cupom
  FROM cupons_desconto
  WHERE upper(trim(codigo)) = upper(trim(p_codigo))
    AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cupom inválido ou inativo');
  END IF;

  IF EXISTS (
    SELECT 1 FROM cupons_uso
    WHERE cupom_id = v_cupom.id
      AND status IN ('reservado', 'confirmado')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este cupom já foi utilizado');
  END IF;

  v_desconto := round(p_valor_original * v_cupom.percentual / 100.0, 2);
  v_final := greatest(round(p_valor_original - v_desconto, 2), 0.01);

  RETURN jsonb_build_object(
    'ok', true,
    'cupom_id', v_cupom.id,
    'codigo', v_cupom.codigo,
    'percentual', v_cupom.percentual,
    'valor_original', p_valor_original,
    'valor_desconto', v_desconto,
    'valor_final', v_final
  );
END;
$$;

-- Reserva atômica ao gerar PIX (impede uso duplo)
CREATE OR REPLACE FUNCTION public.reservar_cupom_desconto(
  p_codigo TEXT,
  p_empresa_id UUID,
  p_valor_original NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cupom cupons_desconto%ROWTYPE;
  v_desconto NUMERIC;
  v_final NUMERIC;
  v_uso_id UUID;
BEGIN
  PERFORM limpar_cupons_reserva_expirada();

  IF p_valor_original IS NULL OR p_valor_original <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Valor do plano inválido');
  END IF;

  SELECT * INTO v_cupom
  FROM cupons_desconto
  WHERE upper(trim(codigo)) = upper(trim(p_codigo))
    AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cupom inválido ou inativo');
  END IF;

  IF EXISTS (
    SELECT 1 FROM cupons_uso
    WHERE cupom_id = v_cupom.id
      AND status IN ('reservado', 'confirmado')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este cupom já foi utilizado');
  END IF;

  v_desconto := round(p_valor_original * v_cupom.percentual / 100.0, 2);
  v_final := greatest(round(p_valor_original - v_desconto, 2), 0.01);

  INSERT INTO cupons_uso (
    cupom_id,
    empresa_id,
    status,
    valor_original,
    valor_desconto,
    valor_final,
    reservado_ate
  ) VALUES (
    v_cupom.id,
    p_empresa_id,
    'reservado',
    p_valor_original,
    v_desconto,
    v_final,
    NOW() + INTERVAL '2 hours'
  )
  RETURNING id INTO v_uso_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cupom_uso_id', v_uso_id,
    'cupom_id', v_cupom.id,
    'codigo', v_cupom.codigo,
    'percentual', v_cupom.percentual,
    'valor_original', p_valor_original,
    'valor_desconto', v_desconto,
    'valor_final', v_final
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este cupom já foi utilizado');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_reserva_cupom(p_cupom_uso_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cupons_uso
  SET status = 'cancelado'
  WHERE id = p_cupom_uso_id
    AND status = 'reservado';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_cupom_uso(
  p_cupom_uso_id UUID,
  p_pagamento_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cupons_uso
  SET
    status = 'confirmado',
    confirmado_em = NOW(),
    pagamento_id = COALESCE(p_pagamento_id, pagamento_id),
    reservado_ate = NULL
  WHERE id = p_cupom_uso_id
    AND status = 'reservado';
  RETURN FOUND;
END;
$$;

COMMENT ON TABLE cupons_desconto IS 'Cupons de desconto criados pelo admin SaaS (uso único)';
COMMENT ON TABLE cupons_uso IS 'Registro de reserva e confirmação de uso de cupom';
