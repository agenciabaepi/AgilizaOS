-- =====================================================
-- TRIGGER SUPER INTELIGENTE - SÓ REGISTRA O QUE MUDOU DE VERDADE
-- =====================================================

-- 1. REMOVER TRIGGERS ANTIGOS
DROP TRIGGER IF EXISTS trg_historico_os ON ordens_servico;
DROP TRIGGER IF EXISTS trg_historico_os_inteligente ON ordens_servico;
DROP TRIGGER IF EXISTS trg_auditoria_os ON ordens_servico;

-- 2. CRIAR FUNÇÃO SUPER INTELIGENTE
CREATE OR REPLACE FUNCTION trigger_historico_os_super_inteligente() RETURNS TRIGGER AS $$
DECLARE
  v_mudancas_reais JSONB := '{}';
  v_descricao_partes TEXT[] := ARRAY[]::TEXT[];
  v_contador INTEGER := 0;
  v_categoria VARCHAR(50) := 'DADOS';
BEGIN
  -- Função auxiliar para verificar se houve mudança real
  -- Retorna TRUE apenas se os valores são realmente diferentes
  CREATE OR REPLACE FUNCTION mudanca_real(v_old TEXT, v_new TEXT) RETURNS BOOLEAN AS $inner$
  BEGIN
    -- Normalizar valores
    v_old := COALESCE(TRIM(v_old), '');
    v_new := COALESCE(TRIM(v_new), '');
    
    -- Tratar valores especiais como vazios
    IF v_old IN ('undefined', 'null', 'NULL') THEN v_old := ''; END IF;
    IF v_new IN ('undefined', 'null', 'NULL') THEN v_new := ''; END IF;
    
    -- Retornar TRUE apenas se há diferença real e pelo menos um não está vazio
    RETURN (v_old != v_new) AND (v_old != '' OR v_new != '');
  END;
  $inner$ LANGUAGE plpgsql;

  -- Verificar STATUS
  IF mudanca_real(OLD.status, NEW.status) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('status', jsonb_build_object('anterior', OLD.status, 'novo', NEW.status));
    v_descricao_partes := v_descricao_partes || ('Status alterado de "' || COALESCE(OLD.status, '(vazio)') || '" para "' || COALESCE(NEW.status, '(vazio)') || '"');
    v_categoria := 'STATUS';
    v_contador := v_contador + 1;
  END IF;

  -- Verificar STATUS TÉCNICO
  IF mudanca_real(OLD.status_tecnico, NEW.status_tecnico) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('status_tecnico', jsonb_build_object('anterior', OLD.status_tecnico, 'novo', NEW.status_tecnico));
    v_descricao_partes := v_descricao_partes || ('Status técnico alterado de "' || COALESCE(OLD.status_tecnico, '(vazio)') || '" para "' || COALESCE(NEW.status_tecnico, '(vazio)') || '"');
    IF v_categoria = 'DADOS' THEN v_categoria := 'STATUS'; END IF;
    v_contador := v_contador + 1;
  END IF;

  -- Verificar EQUIPAMENTO
  IF mudanca_real(OLD.equipamento, NEW.equipamento) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('equipamento', jsonb_build_object('anterior', OLD.equipamento, 'novo', NEW.equipamento));
    v_descricao_partes := v_descricao_partes || ('Equipamento alterado de "' || COALESCE(OLD.equipamento, '(vazio)') || '" para "' || COALESCE(NEW.equipamento, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar MARCA
  IF mudanca_real(OLD.marca, NEW.marca) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('marca', jsonb_build_object('anterior', OLD.marca, 'novo', NEW.marca));
    v_descricao_partes := v_descricao_partes || ('Marca alterada de "' || COALESCE(OLD.marca, '(vazio)') || '" para "' || COALESCE(NEW.marca, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar MODELO
  IF mudanca_real(OLD.modelo, NEW.modelo) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('modelo', jsonb_build_object('anterior', OLD.modelo, 'novo', NEW.modelo));
    v_descricao_partes := v_descricao_partes || ('Modelo alterado de "' || COALESCE(OLD.modelo, '(vazio)') || '" para "' || COALESCE(NEW.modelo, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar COR
  IF mudanca_real(OLD.cor, NEW.cor) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('cor', jsonb_build_object('anterior', OLD.cor, 'novo', NEW.cor));
    v_descricao_partes := v_descricao_partes || ('Cor alterada de "' || COALESCE(OLD.cor, '(vazio)') || '" para "' || COALESCE(NEW.cor, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar NÚMERO DE SÉRIE
  IF mudanca_real(OLD.numero_serie, NEW.numero_serie) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('numero_serie', jsonb_build_object('anterior', OLD.numero_serie, 'novo', NEW.numero_serie));
    v_descricao_partes := v_descricao_partes || ('Número de série alterado de "' || COALESCE(OLD.numero_serie, '(vazio)') || '" para "' || COALESCE(NEW.numero_serie, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar PROBLEMA RELATADO
  IF mudanca_real(OLD.problema_relatado, NEW.problema_relatado) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('problema_relatado', jsonb_build_object('anterior', OLD.problema_relatado, 'novo', NEW.problema_relatado));
    v_descricao_partes := v_descricao_partes || ('Problema relatado foi alterado');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar LAUDO
  IF mudanca_real(OLD.laudo, NEW.laudo) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('laudo', jsonb_build_object('anterior', OLD.laudo, 'novo', NEW.laudo));
    v_descricao_partes := v_descricao_partes || ('Laudo técnico foi alterado');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar SERVIÇO
  IF mudanca_real(OLD.servico, NEW.servico) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('servico', jsonb_build_object('anterior', OLD.servico, 'novo', NEW.servico));
    v_descricao_partes := v_descricao_partes || ('Serviço alterado de "' || COALESCE(OLD.servico, '(vazio)') || '" para "' || COALESCE(NEW.servico, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar PEÇA
  IF mudanca_real(OLD.peca, NEW.peca) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('peca', jsonb_build_object('anterior', OLD.peca, 'novo', NEW.peca));
    v_descricao_partes := v_descricao_partes || ('Peça alterada de "' || COALESCE(OLD.peca, '(vazio)') || '" para "' || COALESCE(NEW.peca, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar ACESSÓRIOS
  IF mudanca_real(OLD.acessorios, NEW.acessorios) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('acessorios', jsonb_build_object('anterior', OLD.acessorios, 'novo', NEW.acessorios));
    v_descricao_partes := v_descricao_partes || ('Acessórios alterados de "' || COALESCE(OLD.acessorios, '(vazio)') || '" para "' || COALESCE(NEW.acessorios, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar CONDIÇÕES DO EQUIPAMENTO
  IF mudanca_real(OLD.condicoes_equipamento, NEW.condicoes_equipamento) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('condicoes_equipamento', jsonb_build_object('anterior', OLD.condicoes_equipamento, 'novo', NEW.condicoes_equipamento));
    v_descricao_partes := v_descricao_partes || ('Condições do equipamento alteradas de "' || COALESCE(OLD.condicoes_equipamento, '(vazio)') || '" para "' || COALESCE(NEW.condicoes_equipamento, '(vazio)') || '"');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar OBSERVAÇÃO
  IF mudanca_real(OLD.observacao, NEW.observacao) THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('observacao', 'alterado');
    v_descricao_partes := v_descricao_partes || ('Observações foram alteradas');
    v_contador := v_contador + 1;
  END IF;

  -- Verificar VALOR FATURADO
  IF OLD.valor_faturado IS DISTINCT FROM NEW.valor_faturado THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('valor_faturado', jsonb_build_object('anterior', OLD.valor_faturado, 'novo', NEW.valor_faturado));
    v_descricao_partes := v_descricao_partes || ('Valor alterado de R$ ' || COALESCE(OLD.valor_faturado::TEXT, '0,00') || ' para R$ ' || COALESCE(NEW.valor_faturado::TEXT, '0,00'));
    v_categoria := 'FINANCEIRO';
    v_contador := v_contador + 1;
  END IF;

  -- Verificar DATA DE ENTREGA
  IF OLD.data_entrega IS DISTINCT FROM NEW.data_entrega THEN
    v_mudancas_reais := v_mudancas_reais || jsonb_build_object('data_entrega', jsonb_build_object('anterior', OLD.data_entrega, 'novo', NEW.data_entrega));
    v_descricao_partes := v_descricao_partes || ('Data de entrega alterada de ' || COALESCE(OLD.data_entrega::TEXT, '(não definida)') || ' para ' || COALESCE(NEW.data_entrega::TEXT, '(não definida)'));
    v_categoria := 'ENTREGA';
    v_contador := v_contador + 1;
  END IF;

  -- Só registrar se houve mudanças REAIS
  IF v_contador > 0 THEN
    PERFORM registrar_historico_os(
      NEW.id,
      CASE 
        WHEN v_categoria = 'STATUS' THEN 'STATUS_CHANGE'
        WHEN v_categoria = 'FINANCEIRO' THEN 'VALUE_CHANGE'
        WHEN v_categoria = 'ENTREGA' THEN 'DELIVERY'
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

  -- Limpar função auxiliar
  DROP FUNCTION IF EXISTS mudanca_real(TEXT, TEXT);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CRIAR TRIGGER SUPER INTELIGENTE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordens_servico') THEN
    CREATE TRIGGER trg_historico_os_super_inteligente
      AFTER UPDATE ON ordens_servico
      FOR EACH ROW
      EXECUTE FUNCTION trigger_historico_os_super_inteligente();
    
    RAISE NOTICE '✅ Trigger SUPER inteligente criado com sucesso!';
  ELSE
    RAISE NOTICE '⚠️ Tabela ordens_servico não encontrada';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ Trigger já existe - removendo e recriando...';
    DROP TRIGGER IF EXISTS trg_historico_os_super_inteligente ON ordens_servico;
    CREATE TRIGGER trg_historico_os_super_inteligente
      AFTER UPDATE ON ordens_servico
      FOR EACH ROW
      EXECUTE FUNCTION trigger_historico_os_super_inteligente();
    RAISE NOTICE '✅ Trigger SUPER inteligente recriado!';
END $$;

-- 4. VERIFICAR RESULTADO
SELECT 
  'Trigger: ' || tgname as nome,
  'Tabela: ' || schemaname || '.' || tablename as tabela,
  '✅ Ativo' as status
FROM pg_trigger t
JOIN pg_tables pt ON pt.tablename = (SELECT relname FROM pg_class WHERE oid = t.tgrelid)
WHERE tgname LIKE '%historico%' AND pt.tablename = 'ordens_servico';

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase Dashboard
-- 2. Agora SÓ campos que realmente mudaram serão registrados
-- 3. Se você alterar apenas a MARCA, só a MARCA aparecerá
-- =====================================================
