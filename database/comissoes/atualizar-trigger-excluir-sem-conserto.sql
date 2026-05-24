-- =====================================================
-- Trigger de comissão: não registrar em OS sem conserto,
-- cliente recusou ou status técnico SEM REPARO
-- =====================================================
-- Execute no Supabase SQL Editor após add_aparelho_sem_conserto.sql

CREATE OR REPLACE FUNCTION registrar_comissao_automatica()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tecnico_record RECORD;
    config_comissao_record RECORD;
    tipo_comissao_tecnico VARCHAR(20);
    valor_comissao_tecnico DECIMAL(10,2);
    valor_comissao_calculado DECIMAL(10,2);
    comissao_existente UUID;
    status_normalizado TEXT;
    status_tecnico_normalizado TEXT;
BEGIN
  status_normalizado := UPPER(TRIM(COALESCE(NEW.status, '')));
  status_tecnico_normalizado := UPPER(TRIM(COALESCE(NEW.status_tecnico, '')));

  IF NOT (
    (status_normalizado = 'ENTREGUE' OR status_normalizado = 'FINALIZADA' OR
     status_tecnico_normalizado = 'FINALIZADA')
    AND NEW.data_entrega IS NOT NULL
    AND NEW.tecnico_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- Não registrar comissão: recusa, sem conserto ou SEM REPARO
  IF COALESCE(NEW.cliente_recusou, false) = true THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.aparelho_sem_conserto, false) = true THEN
    RETURN NEW;
  END IF;

  IF status_normalizado = 'CLIENTE RECUSOU'
     OR status_tecnico_normalizado = 'CLIENTE RECUSOU'
     OR status_tecnico_normalizado IN ('SEM REPARO', 'SEM_REPARO') THEN
    RETURN NEW;
  END IF;

  SELECT id INTO comissao_existente
  FROM comissoes_historico
  WHERE ordem_servico_id = NEW.id
  LIMIT 1;

  IF comissao_existente IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    u.id,
    u.nome,
    u.nivel,
    u.tipo_comissao,
    u.comissao_fixa,
    u.comissao_percentual,
    u.empresa_id,
    COALESCE(u.comissao_ativa, true) AS comissao_ativa
  INTO tecnico_record
  FROM usuarios u
  WHERE u.id = NEW.tecnico_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE WARNING 'Técnico não encontrado para OS %. Técnico ID: %', NEW.numero_os, NEW.tecnico_id;
    RETURN NEW;
  END IF;

  IF tecnico_record.nivel != 'tecnico' THEN
    RETURN NEW;
  END IF;

  IF tecnico_record.comissao_ativa = false THEN
    RETURN NEW;
  END IF;

  SELECT tipo_comissao, comissao_fixa_padrao, comissao_padrao
  INTO config_comissao_record
  FROM configuracoes_comissao
  WHERE empresa_id = tecnico_record.empresa_id
  LIMIT 1;

  IF tecnico_record.tipo_comissao IS NOT NULL THEN
    tipo_comissao_tecnico := tecnico_record.tipo_comissao;
    IF tecnico_record.tipo_comissao = 'fixo' THEN
      valor_comissao_tecnico := COALESCE(tecnico_record.comissao_fixa, 0);
    ELSE
      valor_comissao_tecnico := COALESCE(tecnico_record.comissao_percentual, 0);
    END IF;
  ELSIF config_comissao_record.tipo_comissao IS NOT NULL THEN
    tipo_comissao_tecnico := config_comissao_record.tipo_comissao;
    IF config_comissao_record.tipo_comissao = 'fixo' THEN
      valor_comissao_tecnico := COALESCE(config_comissao_record.comissao_fixa_padrao, 0);
    ELSE
      valor_comissao_tecnico := COALESCE(config_comissao_record.comissao_padrao, 0);
    END IF;
  ELSE
    tipo_comissao_tecnico := 'porcentagem';
    valor_comissao_tecnico := 10;
  END IF;

  IF tipo_comissao_tecnico = 'fixo' THEN
    valor_comissao_calculado := valor_comissao_tecnico;
  ELSIF tipo_comissao_tecnico = 'porcentagem' THEN
    valor_comissao_calculado := (COALESCE(NEW.valor_faturado, 0) * valor_comissao_tecnico / 100);
  ELSE
    valor_comissao_calculado := 0;
  END IF;

  BEGIN
    INSERT INTO comissoes_historico (
      tecnico_id, ordem_servico_id, empresa_id, cliente_id,
      valor_servico, valor_peca, valor_total,
      tipo_comissao, percentual_comissao, valor_comissao_fixa, valor_comissao,
      data_entrega, data_calculo, status, tipo_ordem, observacoes, ativa
    ) VALUES (
      NEW.tecnico_id, NEW.id, NEW.empresa_id, NEW.cliente_id,
      COALESCE(NEW.valor_servico, 0), COALESCE(NEW.valor_peca, 0), COALESCE(NEW.valor_faturado, 0),
      tipo_comissao_tecnico,
      CASE WHEN tipo_comissao_tecnico = 'porcentagem' THEN valor_comissao_tecnico ELSE NULL END,
      CASE WHEN tipo_comissao_tecnico = 'fixo' THEN valor_comissao_tecnico ELSE NULL END,
      valor_comissao_calculado,
      NEW.data_entrega::TIMESTAMP WITH TIME ZONE, NOW(), 'CALCULADA',
      COALESCE(LOWER(NEW.tipo), 'normal'), NULL, true
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO comissoes_historico (
        tecnico_id, ordem_servico_id, empresa_id, cliente_id,
        valor_servico, valor_peca, valor_total,
        tipo_comissao, percentual_comissao, valor_comissao_fixa, valor_comissao,
        data_entrega, data_calculo, status, tipo_ordem, observacoes
      ) VALUES (
        NEW.tecnico_id, NEW.id, NEW.empresa_id, NEW.cliente_id,
        COALESCE(NEW.valor_servico, 0), COALESCE(NEW.valor_peca, 0), COALESCE(NEW.valor_faturado, 0),
        tipo_comissao_tecnico,
        CASE WHEN tipo_comissao_tecnico = 'porcentagem' THEN valor_comissao_tecnico ELSE NULL END,
        CASE WHEN tipo_comissao_tecnico = 'fixo' THEN valor_comissao_tecnico ELSE NULL END,
        valor_comissao_calculado,
        NEW.data_entrega::TIMESTAMP WITH TIME ZONE, NOW(), 'CALCULADA',
        COALESCE(LOWER(NEW.tipo), 'normal'), NULL
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao registrar comissão para OS %: %', NEW.id, SQLERRM;
    END;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Limpar comissões indevidas já existentes (OS entregues sem conserto)
DELETE FROM comissoes_historico ch
USING ordens_servico os
WHERE ch.ordem_servico_id = os.id
  AND (
    COALESCE(os.aparelho_sem_conserto, false) = true
    OR COALESCE(os.cliente_recusou, false) = true
    OR UPPER(TRIM(COALESCE(os.status_tecnico, ''))) IN ('SEM REPARO', 'SEM_REPARO')
    OR UPPER(TRIM(COALESCE(os.status, ''))) = 'CLIENTE RECUSOU'
  );
