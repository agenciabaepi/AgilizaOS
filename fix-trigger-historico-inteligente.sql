-- =====================================================
-- CORRIGIR TRIGGER DO HISTÓRICO - SÓ REGISTRAR MUDANÇAS REAIS
-- =====================================================
-- Este script corrige o problema de registrar mudanças desnecessárias

-- 1. REMOVER TRIGGERS ANTIGOS (TODOS OS POSSÍVEIS NOMES)
DROP TRIGGER IF EXISTS trg_historico_os ON ordens_servico;
DROP TRIGGER IF EXISTS trg_historico_os_inteligente ON ordens_servico;
DROP TRIGGER IF EXISTS trg_auditoria_os ON ordens_servico;

-- 2. CRIAR FUNÇÃO TRIGGER INTELIGENTE
CREATE OR REPLACE FUNCTION trigger_historico_os_inteligente() RETURNS TRIGGER AS $$
DECLARE
  v_mudancas JSONB := '{}';
  v_descricao TEXT := '';
  v_contador INTEGER := 0;
  v_campos_importantes TEXT[] := ARRAY[
    'status', 'status_tecnico', 'valor_faturado', 'data_entrega', 
    'equipamento', 'marca', 'modelo', 'cor', 'numero_serie',
    'problema_relatado', 'laudo', 'servico', 'peca', 'acessorios',
    'condicoes_equipamento', 'observacao'
  ];
  v_campo TEXT;
  v_valor_antigo TEXT;
  v_valor_novo TEXT;
BEGIN
  -- Verificar apenas campos importantes
  FOREACH v_campo IN ARRAY v_campos_importantes
  LOOP
    -- Usar EXECUTE para acessar campos dinamicamente
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', v_campo, v_campo) 
    INTO v_valor_antigo, v_valor_novo 
    USING OLD, NEW;
    
    -- Só registrar se houve mudança REAL e SIGNIFICATIVA
    IF (
      v_valor_antigo IS DISTINCT FROM v_valor_novo AND
      -- Não registrar mudanças vazias
      NOT (COALESCE(v_valor_antigo, '') = '' AND COALESCE(v_valor_novo, '') = '') AND
      NOT (v_valor_antigo = 'undefined' AND COALESCE(v_valor_novo, '') = '') AND
      NOT (COALESCE(v_valor_antigo, '') = '' AND v_valor_novo = 'undefined') AND
      NOT (v_valor_antigo = 'null' AND COALESCE(v_valor_novo, '') = '') AND
      NOT (COALESCE(v_valor_antigo, '') = '' AND v_valor_novo = 'null') AND
      -- Não registrar se os valores são efetivamente iguais (ignorando espaços)
      NOT (TRIM(COALESCE(v_valor_antigo, '')) = TRIM(COALESCE(v_valor_novo, ''))) AND
      -- Garantir que pelo menos um dos valores não está vazio
      (COALESCE(TRIM(v_valor_antigo), '') != '' OR COALESCE(TRIM(v_valor_novo), '') != '')
    ) THEN
      
      -- Adicionar à descrição de forma legível
      IF (v_valor_antigo IS NULL OR v_valor_antigo = '' OR v_valor_antigo = 'undefined') THEN
        -- Valor sendo definido pela primeira vez
        CASE v_campo
          WHEN 'status' THEN
            v_descricao := v_descricao || 'Status definido como "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'status_tecnico' THEN
            v_descricao := v_descricao || 'Status técnico definido como "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'equipamento' THEN
            v_descricao := v_descricao || 'Equipamento definido como "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'marca' THEN
            v_descricao := v_descricao || 'Marca definida como "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'modelo' THEN
            v_descricao := v_descricao || 'Modelo definido como "' || COALESCE(v_valor_novo, '') || '"; ';
          ELSE
            v_descricao := v_descricao || initcap(replace(v_campo, '_', ' ')) || ' definido como "' || COALESCE(v_valor_novo, '') || '"; ';
        END CASE;
      ELSE
        -- Valor sendo alterado
        CASE v_campo
          WHEN 'status' THEN
            v_descricao := v_descricao || 'Status alterado de "' || v_valor_antigo || '" para "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'status_tecnico' THEN
            v_descricao := v_descricao || 'Status técnico alterado de "' || v_valor_antigo || '" para "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'valor_faturado' THEN
            v_descricao := v_descricao || 'Valor alterado de R$ ' || COALESCE(v_valor_antigo, '0') || ' para R$ ' || COALESCE(v_valor_novo, '0') || '; ';
          WHEN 'equipamento' THEN
            v_descricao := v_descricao || 'Equipamento alterado de "' || v_valor_antigo || '" para "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'marca' THEN
            v_descricao := v_descricao || 'Marca alterada de "' || v_valor_antigo || '" para "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'modelo' THEN
            v_descricao := v_descricao || 'Modelo alterado de "' || v_valor_antigo || '" para "' || COALESCE(v_valor_novo, '') || '"; ';
          WHEN 'problema_relatado' THEN
            v_descricao := v_descricao || 'Problema relatado foi alterado; ';
          WHEN 'laudo' THEN
            v_descricao := v_descricao || 'Laudo técnico foi alterado; ';
          WHEN 'observacao' THEN
            v_descricao := v_descricao || 'Observações foram alteradas; ';
          ELSE
            v_descricao := v_descricao || initcap(replace(v_campo, '_', ' ')) || ' alterado; ';
        END CASE;
      END IF;
      
      -- Adicionar aos detalhes JSON
      v_mudancas := v_mudancas || jsonb_build_object(
        v_campo, 
        jsonb_build_object('anterior', v_valor_antigo, 'novo', v_valor_novo)
      );
      
      v_contador := v_contador + 1;
    END IF;
  END LOOP;
  
  -- Só registrar se houve mudanças REAIS
  IF v_contador > 0 THEN
    -- Remover último '; ' da descrição
    v_descricao := RTRIM(v_descricao, '; ');
    
    -- Determinar categoria baseada no tipo de mudança
    DECLARE
      v_categoria VARCHAR(50) := 'DADOS';
    BEGIN
      IF v_mudancas ? 'status' OR v_mudancas ? 'status_tecnico' THEN
        v_categoria := 'STATUS';
      ELSIF v_mudancas ? 'valor_faturado' THEN
        v_categoria := 'FINANCEIRO';
      ELSIF v_mudancas ? 'data_entrega' THEN
        v_categoria := 'ENTREGA';
      END IF;
      
      PERFORM registrar_historico_os(
        NEW.id,
        'UPDATE_FIELDS',
        v_categoria,
        v_descricao,
        v_mudancas,
        NULL,
        NULL,
        NULL,
        NULL, -- usuario_id será determinado pela aplicação
        'Alteração automática',
        NULL,
        NULL,
        NULL,
        'TRIGGER'
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CRIAR NOVO TRIGGER INTELIGENTE
DO $$
BEGIN
  -- Verificar se a tabela ordens_servico existe antes de criar o trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordens_servico') THEN
    CREATE TRIGGER trg_historico_os_inteligente
      AFTER UPDATE ON ordens_servico
      FOR EACH ROW
      EXECUTE FUNCTION trigger_historico_os_inteligente();
    
    RAISE NOTICE '✅ Trigger inteligente criado com sucesso!';
  ELSE
    RAISE NOTICE '⚠️ Tabela ordens_servico não encontrada';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ Trigger já existe - removendo e recriando...';
    DROP TRIGGER IF EXISTS trg_historico_os_inteligente ON ordens_servico;
    CREATE TRIGGER trg_historico_os_inteligente
      AFTER UPDATE ON ordens_servico
      FOR EACH ROW
      EXECUTE FUNCTION trigger_historico_os_inteligente();
    RAISE NOTICE '✅ Trigger recriado com sucesso!';
END $$;

-- 4. VERIFICAR SE FOI CRIADO
SELECT 
  'Trigger: ' || tgname as nome,
  'Tabela: ' || schemaname || '.' || tablename as tabela,
  '✅ Ativo' as status
FROM pg_trigger t
JOIN pg_tables pt ON pt.tablename = (SELECT relname FROM pg_class WHERE oid = t.tgrelid)
WHERE tgname LIKE '%historico%' AND pt.tablename = 'ordens_servico';

-- 5. TESTAR COM UMA ALTERAÇÃO SIMPLES
-- (Descomente as linhas abaixo para testar)
/*
DO $$
DECLARE
  v_os_id UUID;
BEGIN
  -- Buscar uma OS para testar
  SELECT id INTO v_os_id FROM ordens_servico LIMIT 1;
  
  IF v_os_id IS NOT NULL THEN
    -- Fazer uma alteração real
    UPDATE ordens_servico 
    SET equipamento = COALESCE(equipamento, 'Teste') || ' [EDITADO]'
    WHERE id = v_os_id;
    
    RAISE NOTICE 'Teste realizado na OS: %', v_os_id;
  END IF;
END $$;
*/

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase Dashboard
-- 2. Vá em Database > SQL Editor
-- 3. Cole este código e clique em "Run"
-- 4. Agora só mudanças REAIS serão registradas
-- =====================================================
