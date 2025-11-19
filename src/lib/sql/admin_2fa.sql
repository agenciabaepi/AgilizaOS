-- =====================================================
-- SISTEMA DE 2FA PARA ADMIN (VERIFICAÇÃO EM DUAS ETAPAS)
-- =====================================================

-- Tabela para armazenar códigos de verificação 2FA
CREATE TABLE IF NOT EXISTS admin_2fa_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    codigo VARCHAR(6) NOT NULL, -- Código de 6 dígitos
    whatsapp VARCHAR(20), -- Número de WhatsApp para envio
    usado BOOLEAN DEFAULT false,
    expirado BOOLEAN DEFAULT false,
    tentativas INTEGER DEFAULT 0, -- Contador de tentativas de validação
    max_tentativas INTEGER DEFAULT 5, -- Máximo de tentativas permitidas
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Expira em 10 minutos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Índices para busca rápida
    CONSTRAINT admin_2fa_codes_email_idx UNIQUE NULLS NOT DISTINCT (email, created_at)
);

-- Índice para limpeza de códigos expirados
CREATE INDEX IF NOT EXISTS admin_2fa_codes_expires_at_idx ON admin_2fa_codes(expires_at);
CREATE INDEX IF NOT EXISTS admin_2fa_codes_email_idx ON admin_2fa_codes(email);
CREATE INDEX IF NOT EXISTS admin_2fa_codes_codigo_idx ON admin_2fa_codes(codigo);

-- Função para limpar códigos expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION limpar_codigos_2fa_expirados()
RETURNS void AS $$
BEGIN
    UPDATE admin_2fa_codes
    SET expirado = true
    WHERE expires_at < NOW()
    AND (usado = false OR usado IS NULL);
    
    -- Deletar códigos muito antigos (mais de 24 horas)
    DELETE FROM admin_2fa_codes
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE admin_2fa_codes IS 'Armazena códigos de verificação 2FA para login do admin';
COMMENT ON COLUMN admin_2fa_codes.codigo IS 'Código de 6 dígitos enviado via WhatsApp';
COMMENT ON COLUMN admin_2fa_codes.whatsapp IS 'Número de WhatsApp usado para envio do código';
COMMENT ON COLUMN admin_2fa_codes.expires_at IS 'Data/hora de expiração do código (10 minutos após criação)';

