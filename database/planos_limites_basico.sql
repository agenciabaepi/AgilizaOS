-- Limites do Plano Básico + recurso lucro_desempenho no Completo/Trial.
-- Execute no Supabase SQL Editor.

-- Básico: 3 usuários, 50 produtos/serviços, sem lucro/desempenho
UPDATE planos
SET
  limite_usuarios = 3,
  limite_produtos = 50,
  limite_clientes = 500,
  limite_fornecedores = 50,
  descricao = 'Gestão essencial: até 3 usuários, 50 OS/mês, 50 produtos/serviços. Sem lucro e desempenho.',
  recursos_disponiveis = jsonb_build_object(
    'nota_fiscal', false,
    'ia', false,
    'whatsapp_crm', false,
    'lucro_desempenho', false
  ),
  updated_at = NOW()
WHERE slug = 'basico';

-- Completo: tetos altos + lucro/desempenho
UPDATE planos
SET
  limite_usuarios = 50,
  limite_produtos = 5000,
  limite_clientes = 20000,
  limite_fornecedores = 500,
  descricao = 'Sistema completo + Nota Fiscal + IA + CRM WhatsApp + lucro e desempenho',
  recursos_disponiveis = jsonb_build_object(
    'nota_fiscal', true,
    'ia', true,
    'whatsapp_crm', true,
    'lucro_desempenho', true
  ),
  updated_at = NOW()
WHERE slug = 'completo';

-- Trial: alinhado ao Completo (conversão)
UPDATE planos
SET
  limite_usuarios = 10,
  limite_produtos = 200,
  limite_clientes = 1000,
  limite_fornecedores = 100,
  recursos_disponiveis = jsonb_build_object(
    'nota_fiscal', true,
    'ia', true,
    'whatsapp_crm', true,
    'lucro_desempenho', true
  ),
  updated_at = NOW()
WHERE slug = 'trial';

COMMENT ON COLUMN planos.limite_usuarios IS 'Máximo de usuários ativos da empresa no plano';
COMMENT ON COLUMN planos.limite_produtos IS 'Máximo de produtos+serviços (tabela produtos) no plano';
