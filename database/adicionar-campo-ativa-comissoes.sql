-- =====================================================
-- ADICIONAR CAMPO 'ativa' NA TABELA comissoes_historico
-- =====================================================

-- Adicionar coluna 'ativa' se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'comissoes_historico' 
        AND column_name = 'ativa'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE comissoes_historico 
        ADD COLUMN ativa BOOLEAN DEFAULT TRUE NOT NULL;
        
        -- Criar índice para performance
        CREATE INDEX IF NOT EXISTS idx_comissoes_historico_ativa 
            ON comissoes_historico(ativa);
        
        RAISE NOTICE 'Coluna ativa adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna ativa já existe';
    END IF;
END $$;

-- Comentário na coluna
COMMENT ON COLUMN comissoes_historico.ativa IS 'Indica se a comissão está ativa (TRUE) ou desativada (FALSE) pelo admin';

