-- Verificar estrutura de todas as tabelas restantes
-- Execute cada query separadamente para ver as colunas de cada tabela

-- 1. pagamentos
SELECT 'pagamentos' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pagamentos' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. status_historico
SELECT 'status_historico' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'status_historico' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. subcategorias_produtos
SELECT 'subcategorias_produtos' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subcategorias_produtos' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. teste_trigger_log
SELECT 'teste_trigger_log' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teste_trigger_log' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. whatsapp_mensagens
SELECT 'whatsapp_mensagens' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_mensagens' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. whatsapp_messages
SELECT 'whatsapp_messages' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. whatsapp_sessions
SELECT 'whatsapp_sessions' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_sessions' AND table_schema = 'public'
ORDER BY ordinal_position;





