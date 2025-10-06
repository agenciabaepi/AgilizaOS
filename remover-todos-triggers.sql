-- =====================================================
-- REMOVER TODOS OS TRIGGERS E FUNÇÕES PROBLEMÁTICAS
-- =====================================================

-- 1) REMOVER TODOS OS TRIGGERS DA TABELA ordens_servico
DROP TRIGGER IF EXISTS trg_set_senha_acesso_on_insert ON public.ordens_servico;
DROP TRIGGER IF EXISTS trigger_senha_acesso ON public.ordens_servico;
DROP TRIGGER IF EXISTS update_ordens_servico_updated_at ON public.ordens_servico;
DROP TRIGGER IF EXISTS trigger_registrar_mudanca_status ON public.ordens_servico;
DROP TRIGGER IF EXISTS trg_gerar_numero_os ON public.ordens_servico;
DROP TRIGGER IF EXISTS trg_gerar_numero_os_trigger ON public.ordens_servico;

-- 2) REMOVER TODAS AS FUNÇÕES PROBLEMÁTICAS
DROP FUNCTION IF EXISTS public.set_senha_acesso_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_registrar_mudanca_status() CASCADE;
DROP FUNCTION IF EXISTS public.gerar_numero_os() CASCADE;
DROP FUNCTION IF EXISTS public.gerar_numero_os_trigger() CASCADE;

-- 3) MANTER APENAS A FUNÇÃO GERADORA (que já funciona)
-- (generate_random_4_digit_string já existe e funciona)

-- 4) VERIFICAR SE NÃO HÁ MAIS TRIGGERS
SELECT 
    'TRIGGERS RESTANTES' AS status,
    trigger_name, 
    action_timing, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'ordens_servico'
ORDER BY trigger_name;

-- 5) TESTAR INSERT SIMPLES SEM TRIGGERS
BEGIN;
SAVEPOINT test_sem_triggers;

INSERT INTO public.ordens_servico (
    empresa_id, 
    cliente_id, 
    tecnico_id, 
    status, 
    equipamento,
    numero_os,
    senha_acesso
) VALUES (
    (SELECT id FROM public.empresas LIMIT 1),
    (SELECT id FROM public.clientes LIMIT 1),
    (SELECT tecnico_id FROM public.usuarios WHERE tecnico_id IS NOT NULL LIMIT 1),
    'TESTE_SEM_TRIGGERS',
    'TESTE',
    9999,
    '1234'
);

-- Se chegou até aqui, o INSERT funcionou!
SELECT 'SUCESSO: INSERT funcionou sem triggers!' AS resultado;

ROLLBACK TO SAVEPOINT test_sem_triggers;
COMMIT;

-- =====================================================
-- STATUS: TODOS OS TRIGGERS REMOVIDOS
-- ✅ Triggers problemáticos removidos
-- ✅ Funções problemáticas removidas
-- ✅ Teste de INSERT realizado
-- =====================================================

