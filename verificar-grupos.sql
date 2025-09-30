-- Verificar se existem grupos para a empresa específica
SELECT 
  id,
  nome,
  descricao,
  empresa_id,
  created_at
FROM grupos_produtos 
WHERE empresa_id = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac'
ORDER BY created_at DESC;

-- Verificar todos os grupos no banco
SELECT 
  id,
  nome,
  descricao,
  empresa_id,
  created_at
FROM grupos_produtos 
ORDER BY created_at DESC;

-- Verificar se o usuário está autenticado corretamente
SELECT auth.uid() as current_user_id;

-- Verificar dados do usuário
SELECT 
  id,
  nome,
  email,
  empresa_id,
  auth_user_id
FROM usuarios 
WHERE auth_user_id = auth.uid();
