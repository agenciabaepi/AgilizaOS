-- Colunas para Embedded Signup + Coexistência (Meta)
-- Execute no Supabase SQL Editor após 001_whatsapp_crm_schema.sql

ALTER TABLE whatsapp_empresa_config
  ADD COLUMN IF NOT EXISTS waba_id text,
  ADD COLUMN IF NOT EXISTS meta_business_id text,
  ADD COLUMN IF NOT EXISTS connection_mode text CHECK (connection_mode IN ('cloud_api', 'coexistence')),
  ADD COLUMN IF NOT EXISTS is_on_biz_app boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS embedded_signup_at timestamptz;

COMMENT ON COLUMN whatsapp_empresa_config.waba_id IS 'WhatsApp Business Account ID (WABA) retornado pelo Embedded Signup';
COMMENT ON COLUMN whatsapp_empresa_config.connection_mode IS 'cloud_api = só API; coexistence = app Business + API no mesmo número';
COMMENT ON COLUMN whatsapp_empresa_config.is_on_biz_app IS 'true quando número usa coexistência (WhatsApp Business App + Cloud API)';
