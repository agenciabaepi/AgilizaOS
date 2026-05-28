-- Libera uso do sistema sem assinatura/trial válido (cortesia, parceiros, etc.)
-- Admin SaaS ativa em /admin-saas/empresas

ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS sistema_liberado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN empresas.sistema_liberado IS 'Se true, empresa pode usar o app mesmo com assinatura vencida ou sem pagamento. Não substitui empresas.ativo=false.';
