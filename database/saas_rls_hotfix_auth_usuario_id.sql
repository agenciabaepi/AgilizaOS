-- =============================================================================
-- HOTFIX: dados sumiram após RLS SaaS (usuários, termos, checklist, etc.)
-- =============================================================================
-- Causa: policies usavam só `usuarios.auth_user_id = auth.uid()`. No seu projeto
-- há linhas em que `auth_user_id` é NULL e o login casa com `usuarios.id = auth.uid()`
-- (vide api/usuarios/excluir e outros). O subquery de empresa ficava vazio → zero linhas.
--
-- O que fazer: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Não apaga policies que não começam com `saas_auto_` (só recria as nossas).
-- =============================================================================

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

-- ---------------------------------------------------------------------------
-- Recriar policies saas_auto_* e orcamentos_emitidos_itens (mesmo critério
-- do saas_install_completo.sql já corrigido no repositório).
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

    RAISE NOTICE 'SaaS RLS hotfix aplicado: %', tbl.tname;
  END LOOP;
END $$;

DO $$
DECLARE
  pol record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orcamentos_emitidos_itens'
  ) THEN
    RAISE NOTICE 'orcamentos_emitidos_itens não existe — ignorando.';
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

  RAISE NOTICE 'SaaS RLS hotfix: orcamentos_emitidos_itens';
END $$;

-- =============================================================================
-- Fim do hotfix. Recarregue o app.
-- =============================================================================
