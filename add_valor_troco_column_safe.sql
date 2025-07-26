-- Adicionar coluna valor_troco na tabela turnos_caixa se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'turnos_caixa' 
        AND column_name = 'valor_troco'
    ) THEN
        ALTER TABLE turnos_caixa ADD COLUMN valor_troco DECIMAL(10,2) DEFAULT 0;
        COMMENT ON COLUMN turnos_caixa.valor_troco IS 'Valor deixado para troco no fechamento do turno';
    END IF;
END $$;
