-- Dois planos mensais (Básico + Completo) com módulos premium em JSON.
-- Execute no Supabase SQL Editor após backup.

ALTER TABLE planos ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS planos_slug_unique ON planos (slug) WHERE slug IS NOT NULL;

ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS plano_slug TEXT;

-- Trial: todos os módulos premium liberados
UPDATE planos
SET
  slug = 'trial',
  recursos_disponiveis = '{"nota_fiscal":true,"ia":true,"whatsapp_crm":true,"lucro_desempenho":true}'::jsonb
WHERE nome ILIKE 'trial' AND (slug IS NULL OR slug <> 'trial');

INSERT INTO planos (nome, descricao, preco, periodo, ativo, slug, recursos_disponiveis, limite_usuarios, limite_produtos)
SELECT
  'Trial',
  'Período de teste com todos os módulos',
  0,
  'mensal',
  true,
  'trial',
  '{"nota_fiscal":true,"ia":true,"whatsapp_crm":true,"lucro_desempenho":true}'::jsonb,
  10,
  200
WHERE NOT EXISTS (SELECT 1 FROM planos WHERE slug = 'trial');

-- Plano Básico
INSERT INTO planos (nome, descricao, preco, periodo, ativo, slug, recursos_disponiveis, limite_usuarios, limite_produtos)
SELECT
  'Básico',
  'Gestão essencial: até 3 usuários, 50 OS/mês, 50 produtos/serviços. Sem lucro e desempenho.',
  89.90,
  'mensal',
  true,
  'basico',
  '{"nota_fiscal":false,"ia":false,"whatsapp_crm":false,"lucro_desempenho":false}'::jsonb,
  3,
  50
WHERE NOT EXISTS (SELECT 1 FROM planos WHERE slug = 'basico');

UPDATE planos
SET
  nome = 'Básico',
  descricao = 'Gestão essencial: até 3 usuários, 50 OS/mês, 50 produtos/serviços. Sem lucro e desempenho.',
  recursos_disponiveis = '{"nota_fiscal":false,"ia":false,"whatsapp_crm":false,"lucro_desempenho":false}'::jsonb,
  limite_usuarios = 3,
  limite_produtos = 50,
  ativo = true
WHERE slug = 'basico';

-- Plano Completo
INSERT INTO planos (nome, descricao, preco, periodo, ativo, slug, recursos_disponiveis, limite_usuarios, limite_produtos)
SELECT
  'Completo',
  'Sistema completo + Nota Fiscal + IA + CRM WhatsApp + lucro e desempenho',
  149.90,
  'mensal',
  true,
  'completo',
  '{"nota_fiscal":true,"ia":true,"whatsapp_crm":true,"lucro_desempenho":true}'::jsonb,
  50,
  5000
WHERE NOT EXISTS (SELECT 1 FROM planos WHERE slug = 'completo');

UPDATE planos
SET
  nome = 'Completo',
  descricao = 'Sistema completo + Nota Fiscal + IA + CRM WhatsApp + lucro e desempenho',
  recursos_disponiveis = '{"nota_fiscal":true,"ia":true,"whatsapp_crm":true,"lucro_desempenho":true}'::jsonb,
  limite_usuarios = 50,
  limite_produtos = 5000,
  ativo = true
WHERE slug = 'completo';

COMMENT ON COLUMN planos.slug IS 'Identificador estável: trial, basico, completo';
COMMENT ON COLUMN pagamentos.plano_slug IS 'Plano contratado no checkout (basico ou completo)';
