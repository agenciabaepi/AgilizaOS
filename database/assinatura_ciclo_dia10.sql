-- Sistema novo de assinatura: trial 30d → pró-rata → vencimento fixo dia 10.
-- Substitui a lógica de +30 dias e o AND conflitante de data_fim/proxima_cobranca.

ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS tipo_cobranca text;

COMMENT ON COLUMN public.pagamentos.tipo_cobranca IS 'prorata | mensal (sistema novo dia 10)';

CREATE OR REPLACE FUNCTION public.saas_empresa_pode_usar_app(p_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ativo boolean;
  v_liberado boolean;
  v_created timestamptz;
  v_dias_trial int;
  v_status text;
  v_trial_fim date;
  v_cobertura date;
  v_hoje date;
BEGIN
  IF p_empresa_id IS NULL THEN
    RETURN false;
  END IF;

  v_hoje := (timezone('America/Sao_Paulo', now()))::date;

  SELECT
    COALESCE(e.ativo, true),
    COALESCE(e.sistema_liberado, false),
    e.created_at,
    COALESCE(NULLIF(e.dias_trial, 0), 30)
  INTO v_ativo, v_liberado, v_created, v_dias_trial
  FROM public.empresas e
  WHERE e.id = p_empresa_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_ativo IS FALSE THEN
    RETURN false;
  END IF;

  IF v_liberado IS TRUE THEN
    RETURN true;
  END IF;

  SELECT
    lower(COALESCE(a.status, '')),
    CASE
      WHEN a.data_trial_fim IS NOT NULL THEN (timezone('America/Sao_Paulo', a.data_trial_fim::timestamptz))::date
      ELSE NULL
    END,
    GREATEST(
      CASE WHEN a.data_fim IS NOT NULL THEN (timezone('America/Sao_Paulo', a.data_fim::timestamptz))::date ELSE NULL END,
      CASE WHEN a.proxima_cobranca IS NOT NULL THEN (timezone('America/Sao_Paulo', a.proxima_cobranca::timestamptz))::date ELSE NULL END
    )
  INTO v_status, v_trial_fim, v_cobertura
  FROM public.assinaturas a
  WHERE a.empresa_id = p_empresa_id
  ORDER BY a.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_status IN ('cancelled', 'canceled', 'suspended') THEN
    RETURN false;
  END IF;

  -- Cobertura paga (dia 10 inclusive)
  IF v_cobertura IS NOT NULL AND v_hoje <= v_cobertura THEN
    RETURN true;
  END IF;

  -- Trial vigente
  IF v_trial_fim IS NOT NULL AND v_hoje <= v_trial_fim THEN
    RETURN true;
  END IF;

  -- Sem linha de assinatura: trial implícito a partir de created_at
  IF v_status IS NULL OR v_status = '' THEN
    IF v_created IS NOT NULL AND v_hoje <= (timezone('America/Sao_Paulo', v_created)::date + v_dias_trial) THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  IF v_status = 'trial' THEN
    IF v_trial_fim IS NOT NULL THEN
      RETURN v_hoje <= v_trial_fim;
    END IF;
    IF v_created IS NOT NULL THEN
      RETURN v_hoje <= (timezone('America/Sao_Paulo', v_created)::date + v_dias_trial);
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_auth_pode_usar_app()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_empresa uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT u.empresa_id INTO v_empresa
  FROM public.usuarios u
  WHERE u.auth_user_id = v_uid OR u.id = v_uid
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.saas_empresa_pode_usar_app(v_empresa);
END;
$$;
