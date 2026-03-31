-- Diagnóstico: por que a OS 1345 não aparece nas páginas de comissões
-- Execute no Supabase SQL Editor (ajuste numero_os se sua OS for outra).

-- 1) Dados da OS 1345 (numero_os pode ser inteiro ou texto dependendo do schema)
SELECT
  id,
  numero_os,
  tecnico_id,
  empresa_id,
  valor_servico,
  valor_faturado,
  status,
  status_tecnico,
  data_entrega,
  created_at
FROM ordens_servico
WHERE numero_os::text = '1345'
   OR id::text = '1345';

-- 2) Se a OS existe: verificar se técnico_id bate com algum usuário técnico da empresa
-- (substitua EMPRESA_ID e TECNICO_ID pelos valores da query acima)
-- SELECT u.id, u.nome, u.auth_user_id, u.nivel
-- FROM usuarios u
-- WHERE u.empresa_id = 'EMPRESA_ID'
--   AND (u.id = 'TECNICO_ID_DA_OS' OR u.auth_user_id = 'TECNICO_ID_DA_OS');

-- 3) Comissões já registradas para a OS 1345 (por id da OS)
SELECT ch.*, os.numero_os
FROM comissoes_historico ch
JOIN ordens_servico os ON os.id = ch.ordem_servico_id
WHERE os.numero_os::text = '1345';

-- 4) Corrigir tecnico_id se estiver null ou errado (só descomente e ajuste se precisar)
-- UPDATE ordens_servico
-- SET tecnico_id = 'UUID_DO_TECNICO_CORRETO'  -- ou auth_user_id do técnico
-- WHERE numero_os::text = '1345';

-- 5) Garantir valor para comissão (se valor_servico e valor_faturado forem 0)
-- UPDATE ordens_servico
-- SET valor_servico = 80, valor_faturado = 80  -- ajuste o valor
-- WHERE numero_os::text = '1345' AND (COALESCE(valor_servico, 0) + COALESCE(valor_faturado, 0) = 0);
