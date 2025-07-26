-- Adicionar coluna valor_troco na tabela turnos_caixa
ALTER TABLE turnos_caixa 
ADD COLUMN valor_troco DECIMAL(10,2) DEFAULT 0;

-- Comentário na coluna
COMMENT ON COLUMN turnos_caixa.valor_troco IS 'Valor deixado para troco no fechamento do turno';
