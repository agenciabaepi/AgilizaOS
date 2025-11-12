-- =====================================================
-- ADICIONAR SUPORTE A COMISSÃO FIXA POR APARELHO
-- =====================================================
-- Este script adiciona a opção de comissão fixa por aparelho
-- além da opção de porcentagem já existente

-- 1. ADICIONAR CAMPOS NA TABELA configuracoes_comissao
-- =====================================================
ALTER TABLE public.configuracoes_comissao
ADD COLUMN IF NOT EXISTS tipo_comissao VARCHAR(20) DEFAULT 'porcentagem' CHECK (tipo_comissao IN ('porcentagem', 'fixo')),
ADD COLUMN IF NOT EXISTS comissao_fixa_padrao DECIMAL(10,2) DEFAULT 0.00;

-- Comentários para documentação
COMMENT ON COLUMN public.configuracoes_comissao.tipo_comissao IS 'Tipo de comissão: porcentagem ou fixo por aparelho';
COMMENT ON COLUMN public.configuracoes_comissao.comissao_fixa_padrao IS 'Valor fixo padrão de comissão por aparelho (quando tipo_comissao = fixo)';

-- 2. ADICIONAR CAMPOS NA TABELA usuarios (para comissão individual do técnico)
-- =====================================================
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS tipo_comissao VARCHAR(20) DEFAULT NULL CHECK (tipo_comissao IN ('porcentagem', 'fixo')),
ADD COLUMN IF NOT EXISTS comissao_fixa DECIMAL(10,2) DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.usuarios.tipo_comissao IS 'Tipo de comissão individual do técnico (sobrescreve configuração padrão se definido)';
COMMENT ON COLUMN public.usuarios.comissao_fixa IS 'Valor fixo de comissão por aparelho para este técnico (quando tipo_comissao = fixo)';

-- 3. ATUALIZAR VALORES PADRÃO EXISTENTES
-- =====================================================
-- Garantir que registros existentes tenham tipo_comissao = 'porcentagem'
UPDATE public.configuracoes_comissao
SET tipo_comissao = 'porcentagem'
WHERE tipo_comissao IS NULL;

-- 4. VERIFICAR ESTRUTURA
-- =====================================================
-- Execute para verificar:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'configuracoes_comissao' AND column_name LIKE '%comissao%';
--
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'usuarios' AND column_name LIKE '%comissao%';

