-- Habilita Supabase Realtime no CRM WhatsApp
-- Execute no Supabase SQL Editor após 001 e 002
-- Seguro reexecutar: ignora tabelas que já estão na publication.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'whatsapp_mensagens',
    'whatsapp_conversas',
    'whatsapp_conversa_notas'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Adicionada à publication: %', t;
    ELSE
      RAISE NOTICE 'Já na publication: %', t;
    END IF;
  END LOOP;
END $$;
