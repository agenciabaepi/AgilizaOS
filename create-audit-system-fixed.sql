-- =====================================================
-- SISTEMA COMPLETO DE HISTÓRICO DE OS - VERSÃO CORRIGIDA
-- =====================================================
-- Execute este script no Supabase Dashboard > SQL Editor

-- =====================================================
-- 1. CRIAR TABELA DE HISTÓRICO
-- =====================================================

CREATE TABLE IF NOT EXISTS os_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação da OS
  os_id UUID NOT NULL,
  numero_os VARCHAR(50),
  
  -- Tipo de ação realizada
  acao VARCHAR(100) NOT NULL, -- 'STATUS_CHANGE', 'FIELD_UPDATE', 'IMAGE_UPLOAD', etc.
  categoria VARCHAR(50) NOT NULL, -- 'STATUS', 'DADOS', 'ANEXOS', 'FINANCEIRO', 'ENTREGA'
  
  -- Descrição da ação
  descricao TEXT NOT NULL,
  detalhes JSONB, -- Dados estruturados da mudança
  
  -- Valores antes e depois (para mudanças)
  valor_anterior TEXT,
  valor_novo TEXT,
  campo_alterado VARCHAR(100), -- Nome do campo que foi alterado
  
  -- Dados do usuário
  usuario_id UUID,
  usuario_nome VARCHAR(255),
  usuario_tipo VARCHAR(50), -- 'ADMIN', 'TECNICO', 'ATENDENTE', 'SISTEMA'
  
  -- Contexto da ação
  motivo TEXT,
  observacoes TEXT,
  
  -- Metadados técnicos
  ip_address INET,
  user_agent TEXT,
  origem VARCHAR(50), -- 'WEB', 'API', 'TRIGGER', 'SISTEMA'
  
  -- Dados da empresa (para segurança)
  empresa_id UUID NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_os_historico_os_id ON os_historico(os_id);
CREATE INDEX IF NOT EXISTS idx_os_historico_created_at ON os_historico(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_historico_empresa_id ON os_historico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_os_historico_acao ON os_historico(acao);
CREATE INDEX IF NOT EXISTS idx_os_historico_categoria ON os_historico(categoria);
CREATE INDEX IF NOT EXISTS idx_os_historico_usuario_id ON os_historico(usuario_id);
CREATE INDEX IF NOT EXISTS idx_os_historico_os_created ON os_historico(os_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_historico_empresa_periodo ON os_historico(empresa_id, created_at DESC, acao);

-- =====================================================
-- 3. ADICIONAR FOREIGN KEYS (SE AS TABELAS EXISTIREM)
-- =====================================================

-- Adicionar FK para ordens_servico se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordens_servico') THEN
    ALTER TABLE os_historico 
    ADD CONSTRAINT fk_os_historico_os 
    FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Adicionar FK para usuarios se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
    ALTER TABLE os_historico 
    ADD CONSTRAINT fk_os_historico_usuario 
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Adicionar FK para empresas se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresas') THEN
    ALTER TABLE os_historico 
    ADD CONSTRAINT fk_os_historico_empresa 
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 4. FUNÇÃO PARA REGISTRAR HISTÓRICO
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_historico_os(
  p_os_id UUID,
  p_acao VARCHAR(100),
  p_categoria VARCHAR(50),
  p_descricao TEXT,
  p_detalhes JSONB DEFAULT NULL,
  p_valor_anterior TEXT DEFAULT NULL,
  p_valor_novo TEXT DEFAULT NULL,
  p_campo_alterado VARCHAR(100) DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_origem VARCHAR(50) DEFAULT 'WEB'
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_numero_os VARCHAR(50);
  v_empresa_id UUID;
  v_usuario_nome VARCHAR(255);
  v_usuario_tipo VARCHAR(50);
BEGIN
  -- Buscar dados da OS
  SELECT numero_os, empresa_id 
  INTO v_numero_os, v_empresa_id
  FROM ordens_servico 
  WHERE id = p_os_id;
  
  -- Se não encontrou a OS, retornar NULL
  IF v_empresa_id IS NULL THEN
    RAISE WARNING 'OS não encontrada: %', p_os_id;
    RETURN NULL;
  END IF;
  
  -- Buscar dados do usuário se fornecido
  IF p_usuario_id IS NOT NULL THEN
    SELECT nome, nivel 
    INTO v_usuario_nome, v_usuario_tipo
    FROM usuarios 
    WHERE id = p_usuario_id;
  END IF;
  
  -- Inserir registro de histórico
  INSERT INTO os_historico (
    os_id,
    numero_os,
    acao,
    categoria,
    descricao,
    detalhes,
    valor_anterior,
    valor_novo,
    campo_alterado,
    usuario_id,
    usuario_nome,
    usuario_tipo,
    motivo,
    observacoes,
    ip_address,
    user_agent,
    origem,
    empresa_id
  ) VALUES (
    p_os_id,
    v_numero_os,
    p_acao,
    p_categoria,
    p_descricao,
    p_detalhes,
    p_valor_anterior,
    p_valor_novo,
    p_campo_alterado,
    p_usuario_id,
    COALESCE(v_usuario_nome, 'Sistema'),
    COALESCE(v_usuario_tipo, 'SISTEMA'),
    p_motivo,
    p_observacoes,
    p_ip_address,
    p_user_agent,
    p_origem,
    v_empresa_id
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGER PARA MUDANÇAS AUTOMÁTICAS
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_historico_os() RETURNS TRIGGER AS $$
DECLARE
  v_mudancas JSONB := '{}';
  v_descricao TEXT := '';
  v_contador INTEGER := 0;
BEGIN
  -- Verificar mudanças em campos específicos
  
  -- Status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_mudancas := v_mudancas || jsonb_build_object('status', jsonb_build_object('anterior', OLD.status, 'novo', NEW.status));
    v_descricao := v_descricao || 'Status: "' || COALESCE(OLD.status, 'N/A') || '" → "' || COALESCE(NEW.status, 'N/A') || '"; ';
    v_contador := v_contador + 1;
  END IF;
  
  -- Status Técnico
  IF OLD.status_tecnico IS DISTINCT FROM NEW.status_tecnico THEN
    v_mudancas := v_mudancas || jsonb_build_object('status_tecnico', jsonb_build_object('anterior', OLD.status_tecnico, 'novo', NEW.status_tecnico));
    v_descricao := v_descricao || 'Status técnico: "' || COALESCE(OLD.status_tecnico, 'N/A') || '" → "' || COALESCE(NEW.status_tecnico, 'N/A') || '"; ';
    v_contador := v_contador + 1;
  END IF;
  
  -- Valores financeiros
  IF OLD.valor_faturado IS DISTINCT FROM NEW.valor_faturado THEN
    v_mudancas := v_mudancas || jsonb_build_object('valor_faturado', jsonb_build_object('anterior', OLD.valor_faturado, 'novo', NEW.valor_faturado));
    v_descricao := v_descricao || 'Valor faturado: R$ ' || COALESCE(OLD.valor_faturado::TEXT, '0') || ' → R$ ' || COALESCE(NEW.valor_faturado::TEXT, '0') || '; ';
    v_contador := v_contador + 1;
  END IF;
  
  -- Data de entrega
  IF OLD.data_entrega IS DISTINCT FROM NEW.data_entrega THEN
    v_mudancas := v_mudancas || jsonb_build_object('data_entrega', jsonb_build_object('anterior', OLD.data_entrega, 'novo', NEW.data_entrega));
    v_descricao := v_descricao || 'Data entrega: ' || COALESCE(OLD.data_entrega::TEXT, 'N/A') || ' → ' || COALESCE(NEW.data_entrega::TEXT, 'N/A') || '; ';
    v_contador := v_contador + 1;
  END IF;
  
  -- Observações
  IF OLD.observacao IS DISTINCT FROM NEW.observacao THEN
    v_mudancas := v_mudancas || jsonb_build_object('observacao', 'alterado');
    v_descricao := v_descricao || 'Observações alteradas; ';
    v_contador := v_contador + 1;
  END IF;
  
  -- Se houve mudanças, registrar auditoria
  IF v_contador > 0 THEN
    -- Remover último '; ' da descrição
    v_descricao := RTRIM(v_descricao, '; ');
    
    PERFORM registrar_historico_os(
      NEW.id,
      'UPDATE_FIELDS',
      'DADOS',
      v_descricao,
      v_mudancas,
      NULL,
      NULL,
      NULL,
      NULL, -- usuario_id será determinado pela aplicação
      'Mudança automática via trigger',
      NULL,
      NULL,
      NULL,
      'TRIGGER'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger apenas se a tabela ordens_servico existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordens_servico') THEN
    DROP TRIGGER IF EXISTS trg_historico_os ON ordens_servico;
    CREATE TRIGGER trg_historico_os
      AFTER UPDATE ON ordens_servico
      FOR EACH ROW
      EXECUTE FUNCTION trigger_historico_os();
  END IF;
END $$;

-- =====================================================
-- 6. VIEW PARA CONSULTAS SIMPLIFICADAS
-- =====================================================

CREATE OR REPLACE VIEW vw_historico_os AS
SELECT 
  a.id,
  a.os_id,
  a.numero_os,
  a.acao,
  a.categoria,
  a.descricao,
  a.valor_anterior,
  a.valor_novo,
  a.campo_alterado,
  a.usuario_nome,
  a.usuario_tipo,
  a.motivo,
  a.created_at,
  a.empresa_id,
  -- Dados da OS (se existir)
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordens_servico') 
    THEN (SELECT equipamento FROM ordens_servico WHERE id = a.os_id)
    ELSE NULL 
  END as equipamento,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordens_servico') 
    THEN (SELECT status FROM ordens_servico WHERE id = a.os_id)
    ELSE NULL 
  END as status_atual
FROM os_historico a
ORDER BY a.created_at DESC;

-- =====================================================
-- 7. POLÍTICAS RLS PARA SEGURANÇA
-- =====================================================

ALTER TABLE os_historico ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ver histórico da própria empresa
CREATE POLICY "os_historico_select_empresa_policy" ON os_historico
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- Inserção permitida para usuários autenticados da mesma empresa
CREATE POLICY "os_historico_insert_empresa_policy" ON os_historico
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- =====================================================
-- 8. COMENTÁRIOS E VERIFICAÇÃO
-- =====================================================

COMMENT ON TABLE os_historico IS 'Registra todas as ações realizadas em ordens de serviço - histórico completo';
COMMENT ON FUNCTION registrar_historico_os IS 'Função principal para registrar qualquer ação no histórico de OS';

-- Verificar se tudo foi criado corretamente
SELECT 
  'Tabela os_historico criada' as status,
  COUNT(*) as registros
FROM os_historico
UNION ALL
SELECT 
  'Função registrar_historico_os criada' as status,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'registrar_historico_os') THEN 1 ELSE 0 END
UNION ALL
SELECT 
  'Trigger criado' as status,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_historico_os') THEN 1 ELSE 0 END;

-- =====================================================
-- 9. TESTE BÁSICO (OPCIONAL)
-- =====================================================

-- Inserir um registro de teste (descomente para testar)
/*
INSERT INTO os_historico (
  os_id, 
  acao, 
  categoria, 
  descricao, 
  usuario_nome, 
  empresa_id
) VALUES (
  gen_random_uuid(),
  'SYSTEM_TEST',
  'SISTEMA',
  'Teste do sistema de histórico',
  'Sistema',
  (SELECT id FROM empresas LIMIT 1)
);
*/

COMMIT;
