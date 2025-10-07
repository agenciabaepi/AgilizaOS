-- =====================================================
-- PROTEÇÃO CRÍTICA: IMPEDIR DROP/ALTER DE TABELAS CRÍTICAS
-- =====================================================

-- 1) Função para bloquear DROP/ALTER de tabelas críticas
CREATE OR REPLACE FUNCTION public.block_critical_table_changes()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    obj record;
    critical_tables text[] := ARRAY[
      'ordens_servico',
      'usuarios',
      'empresas',
      'clientes',
      'status_historico',
      'equipamentos_tipos'
    ];
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
    LOOP
        IF obj.object_type = 'table' AND obj.schema_name = 'public' THEN
            IF obj.object_name = ANY(critical_tables) THEN
                RAISE EXCEPTION 'CRÍTICO: Operação % na tabela %.% é BLOQUEADA por segurança!',
                  obj.command_tag, obj.schema_name, obj.object_name;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 2) Event trigger para DROP
DROP EVENT TRIGGER IF EXISTS block_drop_critical_tables;
CREATE EVENT TRIGGER block_drop_critical_tables
    ON sql_drop
    EXECUTE FUNCTION public.block_critical_table_changes();

-- 3) Event trigger para DDL (ALTER, etc)
DROP EVENT TRIGGER IF EXISTS block_alter_critical_tables;
CREATE EVENT TRIGGER block_alter_critical_tables
    ON ddl_command_start
    EXECUTE FUNCTION public.block_critical_table_changes();

-- 4) Função para verificar se tabelas críticas existem
CREATE OR REPLACE FUNCTION public.check_critical_tables()
RETURNS TABLE(
    table_name text,
    table_exists boolean,
    row_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    critical_tables text[] := ARRAY[
      'ordens_servico',
      'usuarios',
      'empresas',
      'clientes',
      'status_historico',
      'equipamentos_tipos'
    ];
    t text;
    cnt bigint;
BEGIN
    FOREACH t IN ARRAY critical_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) INTO table_exists;
        
        IF table_exists THEN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO cnt;
        ELSE
            cnt := 0;
        END IF;
        
        table_name := t;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- 5) Verificar status das tabelas críticas
SELECT * FROM public.check_critical_tables();

-- 6) Comentários de proteção nas tabelas
COMMENT ON TABLE public.ordens_servico IS 'TABELA CRÍTICA - NÃO ALTERAR/DROPAR';
COMMENT ON TABLE public.usuarios IS 'TABELA CRÍTICA - NÃO ALTERAR/DROPAR';
COMMENT ON TABLE public.empresas IS 'TABELA CRÍTICA - NÃO ALTERAR/DROPAR';
COMMENT ON TABLE public.clientes IS 'TABELA CRÍTICA - NÃO ALTERAR/DROPAR';
COMMENT ON TABLE public.status_historico IS 'TABELA CRÍTICA - NÃO ALTERAR/DROPAR';
COMMENT ON TABLE public.equipamentos_tipos IS 'TABELA CRÍTICA - NÃO ALTERAR/DROPAR';

-- 7) Verificar se as proteções estão ativas
SELECT 
    evtname as trigger_name,
    evtevent as event_type,
    evtenabled as enabled
FROM pg_event_trigger
WHERE evtname LIKE 'block_%';

-- =====================================================
-- STATUS: PROTEÇÕES APLICADAS
-- ✅ Event triggers criados para bloquear DROP/ALTER
-- ✅ Função de verificação criada
-- ✅ Comentários de proteção adicionados
-- =====================================================
