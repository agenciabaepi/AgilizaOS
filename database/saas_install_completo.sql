-- =============================================================================
-- INSTALAÇÃO COMPLETA SaaS — Gestão Consert (Supabase)
-- =============================================================================
-- Faça backup do projeto antes.
--
-- COMO USAR (você só precisa disto):
--   1. Supabase → SQL Editor → New query
--   2. Cole este arquivo inteiro aqui
--   3. Run
--
-- O que faz:
--   • Cria/recria as funções saas_empresa_pode_usar_app e saas_auth_pode_usar_app
--   • Em TODAS as tabelas públicas que têm coluna empresa_id (exceto lista abaixo),
--     remove as políticas RLS antigas e cria novas com cobrança/trial
--   • Trata orcamentos_emitidos_itens (liga pelo cabeçalho do orçamento)
--
-- NÃO mexe em: assinaturas, empresas, usuarios, planos, codigo_verificacao
-- (para você continuar vendo cadastro / renovação com trial expirado).
--
-- Service role continua ignorando RLS nas APIs que usam admin key.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PARTE 1 — Funções (middleware RPC + checagem RLS)
-- ---------------------------------------------------------------------------

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
  br_today date;
  trial_fim_ts timestamptz;
  ref_date date;
  has_trial_ok boolean;
  has_active_ok boolean;
  has_any_assinatura boolean;
BEGIN
  SELECT e.ativo, e.sistema_liberado, e.created_at
  INTO e_ativo, e_sistema_liberado, e_created
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

  -- Qualquer trial ainda válido (evita linha mais nova cancelada esconder trial)
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
  'true se empresa ativa e (sistema_liberado, trial válido ou assinatura paga em dia).';

COMMENT ON FUNCTION public.saas_auth_pode_usar_app() IS
  'RPC para middleware: usuário tem empresa com acesso SaaS ativo.';


-- ---------------------------------------------------------------------------
-- PARTE 2 — RLS automático (tabelas com empresa_id)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  tbl record;
  pol record;
  v_h text;
  base_using constant text := $q$
    (
      empresa_id IN (
        SELECT u.empresa_id FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
      )
      AND public.saas_empresa_pode_usar_app(empresa_id)
    )
  $q$;
  base_ins_chk constant text := $q$
    (
      empresa_id IN (
        SELECT u.empresa_id FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
      )
      AND public.saas_empresa_pode_usar_app(empresa_id)
    )
  $q$;
BEGIN
  FOR tbl IN
    SELECT c.table_name AS tname
    FROM information_schema.columns c
    INNER JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema
      AND tb.table_name = c.table_name
      AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.column_name = 'empresa_id'
      AND c.table_name NOT IN (
        'assinaturas',
        'empresas',
        'usuarios',
        'planos',
        'codigo_verificacao'
      )
    ORDER BY c.table_name
  LOOP

    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl.tname
        AND policyname ~ '^saas_auto_'
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        pol.policyname,
        tbl.tname
      );
    END LOOP;

    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      tbl.tname
    );

    v_h := substr(md5(tbl.tname)::text, 1, 14);

    EXECUTE format(
      $q$
        CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
        USING %s
      $q$,
      'saas_auto_' || v_h || '_sel',
      tbl.tname,
      base_using
    );

    EXECUTE format(
      $q$
        CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
        WITH CHECK %s
      $q$,
      'saas_auto_' || v_h || '_ins',
      tbl.tname,
      base_ins_chk
    );

    EXECUTE format(
      $q$
        CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
        USING %s
        WITH CHECK %s
      $q$,
      'saas_auto_' || v_h || '_upd',
      tbl.tname,
      base_using,
      base_ins_chk
    );

    EXECUTE format(
      $q$
        CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
        USING %s
      $q$,
      'saas_auto_' || v_h || '_del',
      tbl.tname,
      base_using
    );

    RAISE NOTICE 'SaaS RLS aplicado: %', tbl.tname;
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- PARTE 3 — Itens de orçamento (sem empresa_id na linha)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  pol record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orcamentos_emitidos_itens'
  ) THEN
    RAISE NOTICE 'Tabela orcamentos_emitidos_itens não existe — ignorando.';
    RETURN;
  END IF;

  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orcamentos_emitidos_itens'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.orcamentos_emitidos_itens',
      pol.policyname
    );
  END LOOP;

  ALTER TABLE public.orcamentos_emitidos_itens ENABLE ROW LEVEL SECURITY;

  CREATE POLICY saas_orch_it_sel ON public.orcamentos_emitidos_itens
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orcamentos_emitidos o
        WHERE o.id = orcamentos_emitidos_itens.orcamento_id
          AND o.empresa_id IN (
            SELECT u.empresa_id FROM public.usuarios u
            WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
          )
          AND public.saas_empresa_pode_usar_app(o.empresa_id)
      )
    );

  CREATE POLICY saas_orch_it_ins ON public.orcamentos_emitidos_itens
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orcamentos_emitidos o
        WHERE o.id = orcamento_id
          AND o.empresa_id IN (
            SELECT u.empresa_id FROM public.usuarios u
            WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
          )
          AND public.saas_empresa_pode_usar_app(o.empresa_id)
      )
    );

  CREATE POLICY saas_orch_it_upd ON public.orcamentos_emitidos_itens
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orcamentos_emitidos o
        WHERE o.id = orcamentos_emitidos_itens.orcamento_id
          AND o.empresa_id IN (
            SELECT u.empresa_id FROM public.usuarios u
            WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
          )
          AND public.saas_empresa_pode_usar_app(o.empresa_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orcamentos_emitidos o
        WHERE o.id = orcamento_id
          AND o.empresa_id IN (
            SELECT u.empresa_id FROM public.usuarios u
            WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
          )
          AND public.saas_empresa_pode_usar_app(o.empresa_id)
      )
    );

  CREATE POLICY saas_orch_it_del ON public.orcamentos_emitidos_itens
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orcamentos_emitidos o
        WHERE o.id = orcamentos_emitidos_itens.orcamento_id
          AND o.empresa_id IN (
            SELECT u.empresa_id FROM public.usuarios u
            WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
          )
          AND public.saas_empresa_pode_usar_app(o.empresa_id)
      )
    );

  RAISE NOTICE 'SaaS RLS aplicado: orcamentos_emitidos_itens';
END $$;

-- =============================================================================
-- Fim. Remova SAAS_SKIP_BILLING_RPC do .env em produção após validar.
-- =============================================================================
