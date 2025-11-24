-- =====================================================
-- ATUALIZAÇÃO DOS PLANOS COM SEPARAÇÃO POR MÓDULOS
-- =====================================================
-- 
-- Módulos por Plano:
-- Básico: Sistema de OS completo (clientes, produtos, serviços)
-- Pro: Básico + Módulo financeiro completo
-- Ultra: Pro + Automações WhatsApp + ChatGPT + Editor de foto
-- =====================================================

-- Primeiro, vamos limpar os planos existentes (exceto Trial)
DELETE FROM planos WHERE nome IN ('Básico', 'Pro', 'Avançado', 'Profissional', 'Empresarial');

-- Inserir os novos planos conforme módulos
INSERT INTO planos (
    nome, 
    descricao, 
    preco, 
    periodo,
    limite_usuarios, 
    limite_produtos, 
    limite_clientes, 
    limite_fornecedores, 
    recursos_disponiveis
) VALUES
-- Plano Básico: Sistema de OS completo
(
    'Básico', 
    'Sistema de ordens de serviço completo com cadastro de clientes, produtos e serviços', 
    129.90, 
    'monthly',
    1, 
    200, 
    100, 
    50, 
    '{
        "ordens_servico": true,
        "clientes": true,
        "produtos": true,
        "servicos": true,
        "equipamentos": true,
        "bancada": true,
        "termos": true,
        "comissoes": false,
        "financeiro": false,
        "vendas": false,
        "contas_pagar": false,
        "movimentacao_caixa": false,
        "lucro_desempenho": false,
        "whatsapp": false,
        "chatgpt": false,
        "editor_foto": false,
        "relatorios": true,
        "api": false,
        "suporte": false,
        "nfe": false,
        "estoque": false,
        "permissoes": false,
        "kanban": false,
        "app": false,
        "dashboard": false,
        "relatorios_personalizados": false
    }'
),

-- Plano Pro: Básico + Módulo financeiro completo
(
    'Pro', 
    'Tudo do Básico + Módulo financeiro completo (vendas, contas a pagar, movimentações, lucro e desempenho)', 
    189.90, 
    'monthly',
    5, 
    1000, 
    500, 
    200, 
    '{
        "ordens_servico": true,
        "clientes": true,
        "produtos": true,
        "servicos": true,
        "equipamentos": true,
        "bancada": true,
        "termos": true,
        "comissoes": true,
        "financeiro": true,
        "vendas": true,
        "contas_pagar": true,
        "movimentacao_caixa": true,
        "lucro_desempenho": true,
        "whatsapp": false,
        "chatgpt": false,
        "editor_foto": false,
        "relatorios": true,
        "api": true,
        "suporte": true,
        "nfe": true,
        "estoque": true,
        "permissoes": true,
        "kanban": false,
        "app": false,
        "dashboard": true,
        "relatorios_personalizados": false
    }'
),

-- Plano Ultra: Pro + Automações WhatsApp + ChatGPT + Editor de foto
(
    'Ultra', 
    'Sistema completo + Automações WhatsApp com ChatGPT + Editor de foto nas imagens', 
    279.90, 
    'monthly',
    10, 
    5000, 
    2000, 
    500, 
    '{
        "ordens_servico": true,
        "clientes": true,
        "produtos": true,
        "servicos": true,
        "equipamentos": true,
        "bancada": true,
        "termos": true,
        "comissoes": true,
        "financeiro": true,
        "vendas": true,
        "contas_pagar": true,
        "movimentacao_caixa": true,
        "lucro_desempenho": true,
        "whatsapp": true,
        "chatgpt": true,
        "editor_foto": true,
        "relatorios": true,
        "api": true,
        "suporte": true,
        "nfe": true,
        "estoque": true,
        "permissoes": true,
        "kanban": true,
        "app": true,
        "dashboard": true,
        "relatorios_personalizados": true
    }'
);

-- =====================================================
-- VERIFICAÇÃO DOS PLANOS INSERIDOS
-- =====================================================

SELECT 
    nome,
    descricao,
    preco,
    limite_usuarios,
    limite_produtos,
    limite_clientes,
    limite_fornecedores,
    recursos_disponiveis
FROM planos 
WHERE nome IN ('Básico', 'Pro', 'Ultra')
ORDER BY preco;

-- =====================================================
-- COMENTÁRIOS SOBRE OS MÓDULOS
-- =====================================================

/*
MÓDULOS POR PLANO:

BÁSICO (R$ 129,90/mês):
✅ Sistema de OS completo
✅ Cadastro de clientes
✅ Cadastro de produtos/serviços
✅ Cadastro de equipamentos
✅ Bancada
✅ Termos de garantia
✅ Relatórios básicos
❌ Módulo financeiro
❌ WhatsApp/ChatGPT
❌ Editor de foto

PRO (R$ 189,90/mês):
✅ Tudo do Básico +
✅ Módulo financeiro completo:
   - Vendas
   - Contas a pagar
   - Movimentações de caixa
   - Lucro e desempenho
   - Comissões
✅ Controle de permissões
✅ Controle de estoque
✅ API
✅ Suporte
❌ WhatsApp/ChatGPT
❌ Editor de foto

ULTRA (R$ 279,90/mês):
✅ Tudo do Pro +
✅ Automações WhatsApp
✅ Integração ChatGPT
✅ Editor de foto nas imagens
✅ Kanban para OS
✅ App do técnico
✅ Relatórios personalizados
*/

