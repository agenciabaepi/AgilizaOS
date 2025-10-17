-- =====================================================
-- CRIAR USUÁRIO DE TESTE
-- =====================================================

-- Verificar se há empresas disponíveis
SELECT 
    id,
    nome,
    cnpj
FROM public.empresas 
LIMIT 5;

-- Se houver empresa, criar usuário de teste
INSERT INTO public.usuarios (
    id,
    nome,
    email,
    auth_user_id,
    empresa_id,
    nivel,
    permissoes,
    created_at
) VALUES (
    gen_random_uuid(),
    'wdglp',
    'teste@exemplo.com',
    gen_random_uuid(), -- Este será substituído pelo ID real do Supabase Auth
    (SELECT id FROM public.empresas LIMIT 1), -- Usar primeira empresa disponível
    'admin',
    '{}',
    NOW()
);

-- Verificar se o usuário foi criado
SELECT 
    id,
    nome,
    email,
    auth_user_id,
    empresa_id,
    nivel
FROM public.usuarios 
WHERE nome = 'wdglp';





