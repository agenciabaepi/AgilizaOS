-- Diagnóstico: tabela ordens_servico existe?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'ordens_servico'
) AS tabela_existe;

-- Lista triggers na tabela
SELECT trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'ordens_servico'
ORDER BY trigger_name;

-- Contagem de registros
SELECT COUNT(*) AS total_os FROM public.ordens_servico;

-- Peek em uma OS
SELECT id, numero_os, status, status_tecnico, equipamento, created_at
FROM public.ordens_servico
LIMIT 1;

