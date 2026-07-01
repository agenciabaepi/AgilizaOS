-- Exige pagamento aprovado (ou concessão admin) para assinatura `active` liberar acesso.
-- Rode no Supabase SQL Editor após database/saas_billing_functions.sql

CREATE OR REPLACE FUNCTION public.saas_empresa_pode_usar_app(p_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e_ativo boolean;
  e_sistema_liberado boolean;
  e_created timestamptz;
  e_dias_trial integer;
  br_today date;
  trial_fim_ts timestamptz;
  ref_date date;
  has_trial_ok boolean;
  has_active_ok boolean;
  has_any_assinatura boolean;
  trial_seconds interval;
BEGIN
  SELECT e.ativo, e.sistema_liberado, e.created_at, e.dias_trial
  INTO e_ativo, e_sistema_liberado, e_created, e_dias_trial
  FROM public.empresas e
  WHERE e.id = p_empresa_id;

  IF NOT FOUND OR e_created IS NULL THEN
    RETURN false;
  END IF;

  IF e_ativo IS false THEN
    RETURN false;
  END IF;

  IF e_sistema_liberado IS true THEN
    RETURN true;
  END IF;

  br_today := (timezone('America/Sao_Paulo', now()))::date;
  trial_seconds := make_interval(days => COALESCE(NULLIF(e_dias_trial, 0), 7));

  SELECT EXISTS (
    SELECT 1 FROM public.assinaturas a
    WHERE a.empresa_id = p_empresa_id
      AND a.status = 'trial'
      AND (
        (
          a.data_trial_fim IS NOT NULL
          AND (timezone('America/Sao_Paulo', a.data_trial_fim))::date >= br_today
        )
        OR (
          a.data_trial_fim IS NULL
          AND (timezone('America/Sao_Paulo', e_created + trial_seconds))::date >= br_today
        )
      )
  ) INTO has_trial_ok;

  IF has_trial_ok THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.assinaturas a
    WHERE a.empresa_id = p_empresa_id
      AND a.status = 'active'
      AND (
        a.data_fim IS NULL
        OR (timezone('America/Sao_Paulo', a.data_fim))::date >= br_today
      )
      AND (
        a.proxima_cobranca IS NULL
        OR (timezone('America/Sao_Paulo', a.proxima_cobranca))::date >= br_today
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.pagamentos p
          WHERE p.empresa_id = p_empresa_id
            AND p.status = 'approved'
        )
        OR COALESCE(a.observacoes, '') ILIKE '%pelo admin%'
        OR COALESCE(a.observacoes, '') ILIKE '%concedida pelo admin%'
      )
  ) INTO has_active_ok;

  IF has_active_ok THEN
    RETURN true;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.assinaturas WHERE empresa_id = p_empresa_id)
  INTO has_any_assinatura;

  IF has_any_assinatura THEN
    RETURN false;
  END IF;

  trial_fim_ts := e_created + trial_seconds;
  ref_date := (timezone('America/Sao_Paulo', trial_fim_ts))::date;
  RETURN ref_date >= br_today;
END;
$$;

COMMENT ON FUNCTION public.saas_empresa_pode_usar_app(uuid) IS
  'true se empresa ativa e (sistema_liberado, trial válido ou assinatura paga com pagamento aprovado).';
