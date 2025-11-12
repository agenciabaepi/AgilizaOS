-- =====================================================
-- VERIFICAR ESTRUTURA E DADOS DE COMISSÃO
-- =====================================================

-- 1. Verificar se os campos existem na tabela configuracoes_comissao
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'configuracoes_comissao' 
  AND column_name IN ('tipo_comissao', 'comissao_fixa_padrao')
ORDER BY column_name;

-- 2. Verificar se os campos existem na tabela usuarios
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios' 
  AND column_name IN ('tipo_comissao', 'comissao_fixa')
ORDER BY column_name;

-- 3. Ver todos os dados de configuracoes_comissao
SELECT 
    id,
    empresa_id,
    tipo_comissao,
    comissao_padrao,
    comissao_fixa_padrao,
    comissao_apenas_servico,
    comissao_retorno_ativo,
    created_at
FROM configuracoes_comissao
ORDER BY created_at DESC
LIMIT 10;

-- 4. Ver técnicos com configurações de comissão
SELECT 
    id,
    nome,
    email,
    nivel,
    tipo_comissao,
    comissao_percentual,
    comissao_fixa,
    comissao_ativa
FROM usuarios
WHERE nivel = 'tecnico'
ORDER BY nome
LIMIT 10;

