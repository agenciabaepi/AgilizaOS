-- =====================================================
-- LIMPAR TODOS OS TRIGGERS DUPLICADOS
-- =====================================================
-- Este script remove TODOS os triggers antigos e deixa apenas o correto

-- 1. LISTAR TRIGGERS ATUAIS (para verificar)
SELECT 
  'ANTES DA LIMPEZA:' as status,
  tgname as trigger_name,
  'Tabela: ordens_servico' as tabela
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'ordens_servico' AND tgname LIKE '%historico%';

-- 2. REMOVER TODOS OS TRIGGERS DE HISTÓRICO
DROP TRIGGER IF EXISTS trg_historico_os ON ordens_servico;
DROP TRIGGER IF EXISTS trg_historico_os_inteligente ON ordens_servico;
DROP TRIGGER IF EXISTS trg_auditoria_os ON ordens_servico;
DROP TRIGGER IF EXISTS trg_historico_os_super_inteligente ON ordens_servico;

-- 3. REMOVER FUNÇÕES ANTIGAS TAMBÉM
DROP FUNCTION IF EXISTS trigger_historico_os();
DROP FUNCTION IF EXISTS trigger_historico_os_inteligente();
DROP FUNCTION IF EXISTS trigger_auditoria_os();

-- 4. VERIFICAR SE FORAM REMOVIDOS
SELECT 
  'APÓS REMOÇÃO:' as status,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos os triggers removidos'
    ELSE '❌ Ainda existem: ' || string_agg(tgname, ', ')
  END as resultado
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'ordens_servico' AND tgname LIKE '%historico%';

-- 5. RECRIAR APENAS O TRIGGER SUPER INTELIGENTE
CREATE OR REPLACE FUNCTION trigger_historico_os_super_inteligente() RETURNS TRIGGER AS $$
DECLARE
  v_mudancas_reais JSONB := '{}';
  v_descricao_partes TEXT[] := ARRAY[]::TEXT[];
  v_contador INTEGER := 0;
  v_categoria VARCHAR(50) := 'DADOS';
  
  -- Função auxiliar inline para verificar mudança real
  mudanca_real BOOLEAN;
  v_old_normalizado TEXT;
  v_new_normalizado TEXT;
BEGIN
  -- Macro para verificar mudança real
  -- Normalizar e comparar valores
  
  -- Verificar STATUS
  v_old_normalizado := COALESCE(TRIM(OLD.status), '');
  v_new_normalizado := COALESCE(TRIM(NEW.status), '');
  IF v_old_normalizado IN ('undefined', 'null', 'NULL') THEN v_old_normalizado := ''; END IF;
  IF v_new_normalizado IN ('undefined', 'null', 'NULL') THEN v_new_normalizado := ''; END IF;
  
  IF (v_old_normalizado != v_new_normalizado) AND (v_old_normalizado != '' OR v_new_normalizado != '') THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('status', jsonb_build_object('anterior', OLD.status, 'novo', NEW.status));
    v_descricao_partes := v_descricao_partes || ('Status alterado de "' || COALESCE(OLD.status, '(vazio)') || '" para "' || COALESCE(NEW.status, '(vazio)') || '"');
    v_categoria := 'STATUS';
    v_contador := v_contador + 1;
  END IF;

  -- Verificar MARCA
  v_old_normalizado := COALESCE(TRIM(OLD.marca), '');
  v_new_normalizado := COALESCE(TRIM(NEW.marca), '');
  IF v_old_normalizado IN ('undefined', 'null', 'NULL') THEN v_old_normalizado := ''; END IF;
  IF v_new_normalizado IN ('undefined', 'null', 'NULL') THEN v_new_normalizado := ''; END IF;
  
  IF (v_old_normalizado != v_new_normalizado) AND (v_old_normalizado != '' OR v_new_normalizado != '') THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('marca', jsonb_build_object('anterior', OLD.marca, 'novo', NEW.marca));
    v_descricao_partes := v_descricao_partes || ('Marca alterada de "' || COALESCE(OLD.marca, '(vazio)') || '" para "' || COALESCE(NEW.marca, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar MODELO
  v_old_normalizado := COALESCE(TRIM(OLD.modelo), '');
  v_new_normalizado := COALESCE(TRIM(NEW.modelo), '');
  IF v_old_normalizado IN ('undefined', 'null', 'NULL') THEN v_old_normalizado := ''; END IF;
  IF v_new_normalizado IN ('undefined', 'null', 'NULL') THEN v_new_normalizado := ''; END IF;
  
  IF (v_old_normalizado != v_new_normalizado) AND (v_old_normalizado != '' OR v_new_normalizado != '') THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('modelo', jsonb_build_object('anterior', OLD.modelo, 'novo', NEW.modelo));
    v_descricao_partes := v_descricao_partes || ('Modelo alterado de "' || COALESCE(OLD.modelo, '(vazio)') || '" para "' || COALESCE(NEW.modelo, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar EQUIPAMENTO
  v_old_normalizado := COALESCE(TRIM(OLD.equipamento), '');
  v_new_normalizado := COALESCE(TRIM(NEW.equipamento), '');
  IF v_old_normalizado IN ('undefined', 'null', 'NULL') THEN v_old_normalizado := ''; END IF;
  IF v_new_normalizado IN ('undefined', 'null', 'NULL') THEN v_new_normalizado := ''; END IF;
  
  IF (v_old_normalizado != v_new_normalizado) AND (v_old_normalizado != '' OR v_new_normalizado != '') THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('equipamento', jsonb_build_object('anterior', OLD.equipamento, 'novo', NEW.equipamento));
    v_descricao_partes := v_descricao_partes || ('Equipamento alterado de "' || COALESCE(OLD.equipamento, '(vazio)') || '" para "' || COALESCE(NEW.equipamento, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar COR
  v_old_normalizado := COALESCE(TRIM(OLD.cor), '');
  v_new_normalizado := COALESCE(TRIM(NEW.cor), '');
  IF v_old_normalizado IN ('undefined', 'null', 'NULL') THEN v_old_normalizado := ''; END IF;
  IF v_new_normalizado IN ('undefined', 'null', 'NULL') THEN v_new_normalizado := ''; END IF;
  
  IF (v_old_normalizado != v_new_normalizado) AND (v_old_normalizado != '' OR v_new_normalizado != '') THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('cor', jsonb_build_object('anterior', OLD.cor, 'novo', NEW.cor));
    v_descricao_partes := v_descricao_partes || ('Cor alterada de "' || COALESCE(OLD.cor, '(vazio)') || '" para "' || COALESCE(NEW.cor, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar VALOR FATURADO (numérico)
  IF OLD.valor_faturado IS DISTINCT FROM NEW.valor_faturado THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('valor_faturado', jsonb_build_object('anterior', OLD.valor_faturado, 'novo', NEW.valor_faturado));
    v_descricao_partes := v_descricao_partes || ('Valor alterado de R$ ' || COALESCE(OLD.valor_faturado::TEXT, '0,00') || ' para R$ ' || COALESCE(NEW.valor_faturado::TEXT, '0,00'));
    v_categoria := 'FINANCEIRO';
    v_contador := v_contador + 1;
  END IF;

  -- Só registrar se houve mudanças REAIS
  IF v_contador > 0 THEN
    PERFORM registrar_historico_os(
      NEW.id,
      CASE 
        WHEN v_categoria = 'STATUS' THEN 'STATUS_CHANGE'
        WHEN v_categoria = 'FINANCEIRO' THEN 'VALUE_CHANGE'
        ELSE 'UPDATE_FIELDS'
      END,
      v_categoria,
      array_to_string(v_descricao_partes, '; '),
      v_mudancas_reais,
      NULL,
      NULL,
      NULL,
      NULL,
      'Alteração automática - apenas campos modificados',
      NULL,
      NULL,
      NULL,
      'TRIGGER'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. CRIAR O TRIGGER ÚNICO
CREATE TRIGGER trg_historico_os_unico
  AFTER UPDATE ON ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION trigger_historico_os_super_inteligente();

-- 7. VERIFICAR RESULTADO FINAL
SELECT 
  '✅ RESULTADO FINAL:' as status,
  tgname as trigger_ativo,
  'Tabela: ordens_servico' as tabela
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'ordens_servico' AND tgname LIKE '%historico%';

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase Dashboard
-- 2. Agora terá apenas 1 trigger ativo
-- 3. Teste alterando apenas 1 campo - deve registrar só ele
-- =====================================================
