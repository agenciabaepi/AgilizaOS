-- =====================================================
-- TABELA DE AVISOS DO SISTEMA
-- =====================================================
-- Esta tabela armazena avisos que aparecem no topo do sistema para todos os usuários

CREATE TABLE IF NOT EXISTS avisos_sistema (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'info' CHECK (tipo IN ('info', 'warning', 'error', 'success')),
    cor_fundo VARCHAR(7) DEFAULT '#EF4444', -- Vermelho padrão para urgente
    cor_texto VARCHAR(7) DEFAULT '#FFFFFF', -- Branco padrão
    ativo BOOLEAN DEFAULT true,
    prioridade INT DEFAULT 0, -- Quanto maior, mais importante (aparece primeiro)
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    criado_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_avisos_empresa_id ON avisos_sistema(empresa_id);
CREATE INDEX IF NOT EXISTS idx_avisos_ativo ON avisos_sistema(ativo);
CREATE INDEX IF NOT EXISTS idx_avisos_data ON avisos_sistema(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_avisos_prioridade ON avisos_sistema(prioridade DESC);

-- Comentários
COMMENT ON TABLE avisos_sistema IS 'Avisos do sistema que aparecem no topo para todos os usuários da empresa';
COMMENT ON COLUMN avisos_sistema.tipo IS 'Tipo do aviso: info, warning, error, success';
COMMENT ON COLUMN avisos_sistema.prioridade IS 'Prioridade do aviso (quanto maior, mais importante)';
COMMENT ON COLUMN avisos_sistema.data_inicio IS 'Data de início da exibição do aviso (NULL = imediato)';
COMMENT ON COLUMN avisos_sistema.data_fim IS 'Data de término da exibição (NULL = permanente até desativar)';

