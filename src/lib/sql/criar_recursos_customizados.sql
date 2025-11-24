-- =====================================================
-- SISTEMA DE RECURSOS CUSTOMIZADOS POR EMPRESA
-- =====================================================
-- 
-- Permite que o admin libere/bloqueie recursos específicos
-- para cada empresa, independente do plano
-- =====================================================

-- Opção 1: Adicionar coluna na tabela empresas (mais simples)
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS recursos_customizados JSONB DEFAULT NULL;

-- Comentário
COMMENT ON COLUMN empresas.recursos_customizados IS 
'Recursos customizados liberados/bloqueados manualmente pelo admin. 
Formato: {"financeiro": true, "vendas": false, "whatsapp": true}
Se NULL, usa recursos do plano. Se definido, sobrescreve recursos do plano.';

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_empresas_recursos_customizados 
ON empresas USING GIN (recursos_customizados);

-- =====================================================
-- EXEMPLOS DE USO
-- =====================================================

-- Liberar apenas vendas para uma empresa (plano básico)
-- UPDATE empresas 
-- SET recursos_customizados = '{"vendas": true}'
-- WHERE id = 'empresa-uuid';

-- Liberar financeiro completo para uma empresa
-- UPDATE empresas 
-- SET recursos_customizados = '{"financeiro": true, "vendas": true, "contas_pagar": true, "movimentacao_caixa": true, "lucro_desempenho": true}'
-- WHERE id = 'empresa-uuid';

-- Bloquear WhatsApp de uma empresa (mesmo tendo plano Ultra)
-- UPDATE empresas 
-- SET recursos_customizados = '{"whatsapp": false}'
-- WHERE id = 'empresa-uuid';

-- Remover customização (voltar a usar recursos do plano)
-- UPDATE empresas 
-- SET recursos_customizados = NULL
-- WHERE id = 'empresa-uuid';

