-- Assistente IA do inbox WhatsApp: base de conhecimento por empresa
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS whatsapp_ia_config (
  empresa_id uuid PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT false,
  nome_assistente text NOT NULL DEFAULT 'Assistente virtual',
  -- sempre: responde até um atendente humano entrar na conversa
  -- sem_atendente: só responde conversas sem atendente responsável
  modo_resposta text NOT NULL DEFAULT 'sempre'
    CHECK (modo_resposta IN ('sempre', 'sem_atendente')),
  pausa_apos_humano_min integer NOT NULL DEFAULT 60 CHECK (pausa_apos_humano_min BETWEEN 5 AND 1440),
  endereco text,
  horario_funcionamento text,
  servicos text,
  formas_pagamento text,
  garantia text,
  instrucoes text,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_mensagens
  ADD COLUMN IF NOT EXISTS enviado_por_ia boolean NOT NULL DEFAULT false;

ALTER TABLE whatsapp_conversas
  ADD COLUMN IF NOT EXISTS ia_pausada_ate timestamptz;

COMMENT ON COLUMN whatsapp_conversas.ia_pausada_ate IS
  'Assistente IA não responde esta conversa até este instante (atendente humano assumiu ou cliente pediu humano)';

ALTER TABLE whatsapp_ia_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa pode ver whatsapp_ia_config" ON whatsapp_ia_config;
DROP POLICY IF EXISTS "Empresa pode inserir whatsapp_ia_config" ON whatsapp_ia_config;
DROP POLICY IF EXISTS "Empresa pode atualizar whatsapp_ia_config" ON whatsapp_ia_config;
DROP POLICY IF EXISTS "Service role full whatsapp_ia_config" ON whatsapp_ia_config;

CREATE POLICY "Empresa pode ver whatsapp_ia_config" ON whatsapp_ia_config FOR SELECT USING (
  empresa_id IN (SELECT u.empresa_id FROM usuarios u WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid())
);
CREATE POLICY "Empresa pode inserir whatsapp_ia_config" ON whatsapp_ia_config FOR INSERT WITH CHECK (
  empresa_id IN (SELECT u.empresa_id FROM usuarios u WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid())
);
CREATE POLICY "Empresa pode atualizar whatsapp_ia_config" ON whatsapp_ia_config FOR UPDATE USING (
  empresa_id IN (SELECT u.empresa_id FROM usuarios u WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid())
);
CREATE POLICY "Service role full whatsapp_ia_config" ON whatsapp_ia_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);
