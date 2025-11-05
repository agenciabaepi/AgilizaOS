-- =====================================================
-- ADICIONAR SELEÇÃO DE USUÁRIOS PARA AVISOS
-- =====================================================
-- Adiciona campos para permitir que admin selecione usuários específicos
-- ou exiba avisos para todos os usuários

-- Adicionar coluna para indicar se exibe para todos
ALTER TABLE avisos_sistema
ADD COLUMN IF NOT EXISTS exibir_para_todos BOOLEAN DEFAULT true;

-- Adicionar coluna para armazenar IDs dos usuários selecionados (array de UUIDs)
ALTER TABLE avisos_sistema
ADD COLUMN IF NOT EXISTS usuarios_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Atualizar comentários
COMMENT ON COLUMN avisos_sistema.exibir_para_todos IS 'Se true, exibe o aviso para todos os usuários da empresa. Se false, exibe apenas para os usuários em usuarios_ids';
COMMENT ON COLUMN avisos_sistema.usuarios_ids IS 'Array de IDs de usuários que devem ver o aviso quando exibir_para_todos for false';

-- Criar índice para busca por usuário (usando GIN index para arrays)
CREATE INDEX IF NOT EXISTS idx_avisos_usuarios_ids ON avisos_sistema USING GIN(usuarios_ids);

-- Atualizar registros existentes para manter compatibilidade (todos os avisos existentes serão "para todos")
UPDATE avisos_sistema SET exibir_para_todos = true WHERE exibir_para_todos IS NULL;

