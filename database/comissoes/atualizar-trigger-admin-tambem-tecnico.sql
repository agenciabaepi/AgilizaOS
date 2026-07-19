-- Atualiza a checagem de nível nas funções de comissão
-- para aceitar admin/usuarioteste com tambem_tecnico = true.
-- Execute após add_usuarios_tambem_tecnico.sql

DO $$
DECLARE
  r record;
  fn_src text;
  fn_new text;
  old_check text := 'IF tecnico_record.nivel != ''tecnico'' THEN';
  new_check text := 'IF NOT (tecnico_record.nivel = ''tecnico'' OR ((tecnico_record.nivel = ''admin'' OR tecnico_record.nivel = ''usuarioteste'') AND COALESCE(tecnico_record.tambem_tecnico, false) = true)) THEN';
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) ILIKE '%nivel != ''tecnico''%'
  LOOP
    fn_src := pg_get_functiondef(r.oid);
    IF position(old_check in fn_src) > 0 THEN
      fn_new := replace(fn_src, old_check, new_check);
      EXECUTE fn_new;
      RAISE NOTICE 'Função % atualizada para aceitar admin tambem_tecnico', r.proname;
    END IF;
  END LOOP;
END $$;
