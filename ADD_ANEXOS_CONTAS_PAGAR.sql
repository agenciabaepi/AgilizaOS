-- Script para adicionar suporte a anexos nas contas a pagar
-- Execute este script no Editor SQL do Supabase

-- 1. Adicionar campo anexos_url na tabela contas_pagar
DO $$
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contas_pagar' 
        AND column_name = 'anexos_url'
    ) THEN
        -- Adicionar coluna anexos_url como array de strings
        ALTER TABLE contas_pagar 
        ADD COLUMN anexos_url TEXT[] DEFAULT '{}';
        
        -- Adicionar comentário explicativo
        COMMENT ON COLUMN contas_pagar.anexos_url IS 'Array de URLs dos anexos (comprovantes, notas fiscais, etc.)';
        
        -- Criar índice para performance em buscas
        CREATE INDEX idx_contas_pagar_anexos ON contas_pagar USING GIN (anexos_url);
        
        RAISE NOTICE 'Coluna anexos_url adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna anexos_url já existe.';
    END IF;
END $$;

-- 2. Verificar se foi criado corretamente
SELECT 
    'Anexos configurados' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contas_pagar' 
AND column_name = 'anexos_url';

-- 3. Mostrar estrutura atualizada da tabela
SELECT 
    'Estrutura da tabela contas_pagar' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'contas_pagar' 
ORDER BY ordinal_position;
