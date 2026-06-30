-- Dois planos mensais (Básico + Completo) com módulos premium em JSON.
-- Execute no Supabase SQL Editor após backup.

ALTER TABLE planos ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS planos_slug_unique ON planos (slug) WHERE slug IS NOT NULL;

ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS plano_slug TEXT;

-- Trial: todos os módulos premium liberados
UPDATE planos
SET
  slug = 'trial',
  recursos_disponiveis = '{"nota_fiscal":true,"ia":true,"whatsapp_crm":true}'::jsonb
WHERE nome ILIKE 'trial' AND (slug IS NULL OR slug <> 'trial');

INSERT INTO planos (nome, descricao, preco, periodo, ativo, slug, recursos_disponiveis, limite_usuarios)
SELECT
  'Trial',
  'Período de teste com todos os módulos',
  0,
  'mensal',
  true,
  'trial',
  '{"nota_fiscal":true,"ia":true,"whatsapp_crm":true}'::jsonb,
  10
WHERE NOT EXISTS (SELECT 1 FROM planos WHERE slug = 'trial');

-- Plano Básico
INSERT INTO planos (nome, descricao, preco, periodo, ativo, slug, recursos_disponiveis, limite_usuarios)
SELECT
  'Básico',
  'Sistema completo de gestão para assistência técnica',
  89.90,
  'mensal',
  true,
  'basico',
  '{"nota_fiscal":false,"ia":false,"whatsapp_crm":false}'::jsonb,
  10
WHERE NOT EXISTS (SELECT 1 FROM planos WHERE slug = 'basico');

UPDATE planos
SET
  nome = 'Básico',
  descricao = 'Sistema completo de gestão para assistência técnica',
  recursos_disponiveis = '{"nota_fiscal":false,"ia":false,"whatsapp_crm":false}'::jsonb,
  ativo = true
WHERE slug = 'basico';

-- Plano Completo
INSERT INTO planos (nome, descricao, preco, periodo, ativo, slug, recursos_disponiveis, limite_usuarios)
SELECT
  'Completo',
  'Sistema completo + Nota Fiscal + IA + CRM WhatsApp',
  149.90,
  'mensal',
  true,
  'completo',
  '{"nota_fiscal":true,"ia":true,"whatsapp_crm":true}'::jsonb,
  10
WHERE NOT EXISTS (SELECT 1 FROM planos WHERE slug = 'completo');

UPDATE planos
SET
  nome = 'Completo',
  descricao = 'Sistema completo + Nota Fiscal + IA + CRM WhatsApp',
  recursos_disponiveis = '{"nota_fiscal":true,"ia":true,"whatsapp_crm":true}'::jsonb,
  ativo = true
WHERE slug = 'completo';

COMMENT ON COLUMN planos.slug IS 'Identificador estável: trial, basico, completo';
COMMENT ON COLUMN pagamentos.plano_slug IS 'Plano contratado no checkout (basico ou completo)';
