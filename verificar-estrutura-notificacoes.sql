-- Verificar a estrutura da tabela notificacoes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notificacoes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

