-- =====================================================
-- SISTEMA DE TICKETS DE SUPORTE
-- =====================================================

-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS tickets_suporte (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Informações do ticket
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(50) DEFAULT 'bug', -- bug, melhoria, duvida, outro
    prioridade VARCHAR(20) DEFAULT 'media', -- baixa, media, alta, critica
    status VARCHAR(20) DEFAULT 'aberto', -- aberto, em_desenvolvimento, aguardando_resposta, resolvido, fechado
    
    -- Anexos (URLs de arquivos)
    anexos_url TEXT[] DEFAULT '{}',
    
    -- Resposta do suporte
    resposta_suporte TEXT,
    resolvido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    resolvido_em TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices
    CONSTRAINT tickets_status_check CHECK (status IN ('aberto', 'em_desenvolvimento', 'aguardando_resposta', 'resolvido', 'fechado')),
    CONSTRAINT tickets_prioridade_check CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
    CONSTRAINT tickets_categoria_check CHECK (categoria IN ('bug', 'melhoria', 'duvida', 'outro'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tickets_empresa_id ON tickets_suporte(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets_suporte(status);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridade ON tickets_suporte(prioridade);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets_suporte(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_usuario_id ON tickets_suporte(usuario_id);

-- Tabela de comentários/respostas do ticket
CREATE TABLE IF NOT EXISTS tickets_comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets_suporte(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Conteúdo
    comentario TEXT NOT NULL,
    anexos_url TEXT[] DEFAULT '{}',
    
    -- Tipo: empresa ou suporte
    tipo VARCHAR(20) DEFAULT 'empresa', -- empresa, suporte
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT tickets_comentarios_tipo_check CHECK (tipo IN ('empresa', 'suporte'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_comentarios_ticket_id ON tickets_comentarios(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_comentarios_created_at ON tickets_comentarios(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tickets_suporte
-- Empresas podem ver apenas seus próprios tickets
CREATE POLICY "Empresas podem ver seus tickets" ON tickets_suporte
    FOR SELECT USING (
        empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    );

-- Empresas podem criar tickets
CREATE POLICY "Empresas podem criar tickets" ON tickets_suporte
    FOR INSERT WITH CHECK (
        empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    );

-- Empresas podem atualizar seus próprios tickets (apenas alguns campos)
CREATE POLICY "Empresas podem atualizar seus tickets" ON tickets_suporte
    FOR UPDATE USING (
        empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    ) WITH CHECK (
        empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    );

-- Admin SaaS pode ver todos os tickets
CREATE POLICY "Admin SaaS pode ver todos os tickets" ON tickets_suporte
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@admin.com')
    ) WITH CHECK (
        auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@admin.com')
    );

-- Políticas RLS para tickets_comentarios
-- Empresas podem ver comentários de seus tickets
CREATE POLICY "Empresas podem ver comentários de seus tickets" ON tickets_comentarios
    FOR SELECT USING (
        ticket_id IN (
            SELECT id FROM tickets_suporte 
            WHERE empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
        )
    );

-- Empresas podem criar comentários em seus tickets
CREATE POLICY "Empresas podem criar comentários" ON tickets_comentarios
    FOR INSERT WITH CHECK (
        ticket_id IN (
            SELECT id FROM tickets_suporte 
            WHERE empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
        )
    );

-- Admin SaaS pode ver e criar comentários em todos os tickets
CREATE POLICY "Admin SaaS pode gerenciar comentários" ON tickets_comentarios
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@admin.com')
    ) WITH CHECK (
        auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@admin.com')
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tickets_suporte_updated_at
    BEFORE UPDATE ON tickets_suporte
    FOR EACH ROW
    EXECUTE FUNCTION update_tickets_updated_at();

-- Comentários: atualizar updated_at do ticket quando comentário é adicionado
CREATE OR REPLACE FUNCTION update_ticket_on_comment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tickets_suporte 
    SET updated_at = NOW() 
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_on_comment_trigger
    AFTER INSERT ON tickets_comentarios
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_on_comment();

