-- =====================================================
-- DESABILITAR TRIGGER COMPLETAMENTE
-- =====================================================
-- O trigger está causando mais problemas do que soluções
-- Vamos desabilitá-lo e deixar apenas o registro manual via API

-- 1. REMOVER TODOS OS TRIGGERS
DROP TRIGGER IF EXISTS trg_historico_os ON ordens_servico;
DROP TRIGGER IF EXISTS trg_historico_os_inteligente ON ordens_servico;
DROP TRIGGER IF EXISTS trg_historico_os_super_inteligente ON ordens_servico;
DROP TRIGGER IF EXISTS trg_auditoria_os ON ordens_servico;
DROP TRIGGER IF EXISTS trg_historico_os_unico ON ordens_servico;

-- 2. REMOVER FUNÇÕES RELACIONADAS
DROP FUNCTION IF EXISTS trigger_historico_os();
DROP FUNCTION IF EXISTS trigger_historico_os_inteligente();
DROP FUNCTION IF EXISTS trigger_historico_os_super_inteligente();
DROP FUNCTION IF EXISTS trigger_auditoria_os();

-- 3. VERIFICAR SE FORAM REMOVIDOS
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ TODOS OS TRIGGERS REMOVIDOS - Histórico será controlado apenas pela aplicação'
    ELSE '❌ Ainda existem triggers: ' || string_agg(tgname, ', ')
  END as status
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'ordens_servico' AND tgname LIKE '%historico%';

-- 4. LIMPAR REGISTROS DUPLICADOS EXISTENTES (OPCIONAL)
-- Descomente as linhas abaixo se quiser limpar o histórico duplicado

/*
-- Remover registros duplicados do histórico (manter apenas o mais recente de cada tipo)
WITH duplicados AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY os_id, acao, categoria, DATE_TRUNC('minute', created_at)
      ORDER BY created_at DESC
    ) as rn
  FROM os_historico
  WHERE origem = 'TRIGGER'
)
DELETE FROM os_historico 
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);

SELECT 'Registros duplicados removidos' as limpeza;
*/

-- =====================================================
-- RESULTADO:
-- ✅ Sem triggers automáticos
-- ✅ Histórico controlado apenas pela aplicação
-- ✅ Registros mais precisos e limpos
-- =====================================================
