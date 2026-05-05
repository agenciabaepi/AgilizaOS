-- =============================================================================
-- SaaS: funções de acesso por assinatura / trial (Supabase / Postgres)
-- =============================================================================
-- Preferível: rode database/saas_install_completo.sql uma vez — inclui estas
-- funções e aplica RLS em todas as tabelas com empresa_id automaticamente.
--
-- Este arquivo sozinho só cria as funções (útil se você já tratou RLS à mão).
-- Rode no SQL Editor do Supabase (ou migração) após backup.
-- Alinha com o app: trial em `assinaturas`, trial implícito (15×24h desde
-- `empresas.created_at` se não houver linha), dias civis no fuso abaixo.
--
-- Depois de criar:
--   1) Middleware Next chama RPC `saas_auth_pode_usar_app`.
--   2) Em políticas RLS de tabelas operacionais, acrescente em USING / WITH CHECK:
--        AND public.saas_empresa_pode_usar_app(empresa_id)
--      (não aplique em `usuarios`/`empresas` se precisar ler o próprio cadastro
--       com assinatura vencida — veja comentário no final.)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.saas_empresa_pode_usar_app(p_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e_ativo boolean;
  e_created timestamptz;
  br_today date;
  trial_fim_ts timestamptz;
  ref_date date;
  has_trial_ok boolean;
  has_active_ok boolean;
  has_any_assinatura boolean;
BEGIN
  SELECT e.ativo, e.created_at INTO e_ativo, e_created
  FROM public.empresas e
  WHERE e.id = p_empresa_id;

  IF NOT FOUND OR e_created IS NULL THEN
    RETURN false;
  END IF;

  IF e_ativo IS false THEN
    RETURN false;
  END IF;

  br_today := (timezone('America/Sao_Paulo', now()))::date;

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
          AND (timezone('America/Sao_Paulo', e_created + interval '1296000 seconds'))::date >= br_today
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
  ) INTO has_active_ok;

  IF has_active_ok THEN
    RETURN true;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.assinaturas WHERE empresa_id = p_empresa_id)
  INTO has_any_assinatura;

  IF has_any_assinatura THEN
    RETURN false;
  END IF;

  trial_fim_ts := e_created + interval '1296000 seconds';
  ref_date := (timezone('America/Sao_Paulo', trial_fim_ts))::date;
  RETURN ref_date >= br_today;
END;
$$;

REVOKE ALL ON FUNCTION public.saas_empresa_pode_usar_app(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_empresa_pode_usar_app(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.saas_auth_pode_usar_app()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT public.saas_empresa_pode_usar_app(u.empresa_id)
      FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
      ORDER BY u.created_at NULLS LAST
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.saas_auth_pode_usar_app() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_auth_pode_usar_app() TO authenticated;

COMMENT ON FUNCTION public.saas_empresa_pode_usar_app(uuid) IS
  'true se empresa ativa e (trial válido ou assinatura paga em dia). Usar em RLS.';

COMMENT ON FUNCTION public.saas_auth_pode_usar_app() IS
  'true se o usuário autenticado (JWT) pertence a empresa com acesso SaaS ativo. Usado pelo middleware.';

-- -----------------------------------------------------------------------------
-- RLS: exemplo (ajuste nomes de policies reais; consulte pg_policies).
-- Não descomente sem revisar — políticas duplicadas quebram o deploy.
--
-- CREATE POLICY "ordens_empresa_e_billing" ON public.ordens_servico
--   FOR ALL TO authenticated
--   USING (
--     empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
--     AND public.saas_empresa_pode_usar_app(empresa_id)
--   )
--   WITH CHECK (
--     empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
--     AND public.saas_empresa_pode_usar_app(empresa_id)
--   );
-- -----------------------------------------------------------------------------
