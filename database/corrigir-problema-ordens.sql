-- =====================================================
-- CORREÇÃO: Resolver problemas que impedem ordens de carregar
-- =====================================================

-- PASSO 1: REMOVER atendente_id INVÁLIDO (que não existe em usuarios)
-- =====================================================
UPDATE public.ordens_servico os
SET atendente_id = NULL
WHERE os.atendente_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.id = os.atendente_id
  );

-- PASSO 2: GARANTIR QUE A COLUNA EXISTE (se não existir, criar)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ordens_servico'
      AND column_name = 'atendente_id'
  ) THEN
    ALTER TABLE public.ordens_servico
      ADD COLUMN atendente_id UUID;
  END IF;
END $$;

-- PASSO 3: REMOVER FOREIGN KEY PROBLEMÁTICA (se existir)
-- =====================================================
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Encontrar constraint de foreign key para atendente_id
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'ordens_servico'::regclass
    AND contype = 'f'
    AND conname LIKE '%atendente%';
  
  -- Se encontrou, remover
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ordens_servico DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Constraint % removida', constraint_name;
  END IF;
END $$;

-- PASSO 4: RECRIAR FOREIGN KEY CORRETAMENTE (com ON DELETE SET NULL)
-- =====================================================
DO $$
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'ordens_servico'::regclass
      AND contype = 'f'
      AND conname = 'ordens_servico_atendente_id_fkey'
  ) THEN
    ALTER TABLE public.ordens_servico
      ADD CONSTRAINT ordens_servico_atendente_id_fkey
      FOREIGN KEY (atendente_id) 
      REFERENCES public.usuarios(id) 
      ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key criada com sucesso';
  ELSE
    RAISE NOTICE 'Foreign key já existe';
  END IF;
END $$;

-- PASSO 5: TENTAR PREENCHER atendente_id COM BASE NO NOME (se ainda estiver NULL)
-- =====================================================
UPDATE public.ordens_servico os
SET atendente_id = u.id
FROM public.usuarios u
WHERE os.atendente_id IS NULL
  AND os.atendente IS NOT NULL
  AND os.atendente != ''
  AND LOWER(TRIM(u.nome)) = LOWER(TRIM(os.atendente))
  AND u.empresa_id = os.empresa_id
  AND u.id IS NOT NULL;

-- PASSO 6: CRIAR ÍNDICE (se não existir)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ordens_servico_atendente_id 
  ON public.ordens_servico(atendente_id)
  WHERE atendente_id IS NOT NULL;

-- PASSO 7: VERIFICAR RESULTADO
-- =====================================================
SELECT 
  'Total de ordens' as descricao,
  COUNT(*) as valor
FROM public.ordens_servico
UNION ALL
SELECT 
  'Ordens com atendente_id válido' as descricao,
  COUNT(*) as valor
FROM public.ordens_servico os
WHERE os.atendente_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.id = os.atendente_id
  )
UNION ALL
SELECT 
  'Ordens sem atendente_id' as descricao,
  COUNT(*) as valor
FROM public.ordens_servico
WHERE atendente_id IS NULL;

