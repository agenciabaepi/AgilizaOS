-- =====================================================
-- TESTE DIRETO DE ATUALIZAÇÃO NO BANCO
-- =====================================================
-- Este script testa se conseguimos atualizar uma OS diretamente no banco

-- 1. VERIFICAR SE A OS #124 EXISTE
SELECT 
    id,
    numero_os,
    status,
    status_tecnico,
    equipamento,
    marca,
    modelo
FROM public.ordens_servico 
WHERE numero_os = '124'
LIMIT 1;

-- 2. TESTAR ATUALIZAÇÃO SIMPLES
UPDATE public.ordens_servico 
SET status = 'ORÇAMENTO'
WHERE numero_os = '124'
RETURNING id, numero_os, status;

-- 3. TESTAR ATUALIZAÇÃO COM MAIS CAMPOS
UPDATE public.ordens_servico 
SET 
    status = 'ORÇAMENTO',
    status_tecnico = 'em atendimento',
    equipamento = 'CELULAR',
    marca = 'APPLE',
    modelo = 'IPHONE 11',
    cor = 'ROSA',
    numero_serie = '123123',
    problema_relatado = 'NÃO LIGA'
WHERE numero_os = '124'
RETURNING id, numero_os, status, equipamento, marca, modelo;

-- 4. VERIFICAR SE A ATUALIZAÇÃO FUNCIONOU
SELECT 
    id,
    numero_os,
    status,
    status_tecnico,
    equipamento,
    marca,
    modelo,
    cor,
    numero_serie,
    problema_relatado
FROM public.ordens_servico 
WHERE numero_os = '124';

