-- Auditoria de impersonation (admin SaaS entra como usuário de cliente)
CREATE TABLE IF NOT EXISTS admin_impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  target_usuario_id UUID NOT NULL,
  target_auth_user_id UUID,
  target_nome TEXT,
  target_email TEXT,
  empresa_id UUID NOT NULL,
  empresa_nome TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_impersonation_logs_empresa
  ON admin_impersonation_logs (empresa_id);

CREATE INDEX IF NOT EXISTS idx_admin_impersonation_logs_started
  ON admin_impersonation_logs (started_at DESC);
