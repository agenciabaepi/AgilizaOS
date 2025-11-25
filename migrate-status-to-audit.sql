-- =====================================================
-- MIGRAÇÃO: STATUS_HISTORICO → OS_AUDITORIA
-- =====================================================
-- Este script migra os dados existentes do status_historico
-- para a nova tabela os_auditoria mais completa

-- =====================================================
-- 1. VERIFICAR TABELAS EXISTENTES
-- =====================================================

-- Verificar se as tabelas existem
SELECT 
  'status_historico' as tabela,
  COUNT(*) as registros
FROM status_historico
UNION ALL
SELECT 
  'os_auditoria' as tabela,
  COUNT(*) as registros
FROM os_auditoria;

-- =====================================================
-- 2. MIGRAR DADOS EXISTENTES
-- =====================================================

-- Inserir dados do status_historico na nova tabela os_auditoria
INSERT INTO os_auditoria (
  os_id,
  numero_os,
  acao,
  categoria,
  descricao,
  detalhes,
  valor_anterior,
  valor_novo,
  campo_alterado,
  usuario_id,
  usuario_nome,
  usuario_tipo,
  motivo,
  observacoes,
  created_at,
  empresa_id
)
SELECT 
  sh.os_id,
  os.numero_os,
  'STATUS_CHANGE' as acao,
  'STATUS' as categoria,
  CASE 
    WHEN sh.status_anterior IS NOT NULL AND sh.status_novo IS NOT NULL THEN
      'Status alterado de "' || sh.status_anterior || '" para "' || sh.status_novo || '"'
    WHEN sh.status_tecnico_anterior IS NOT NULL AND sh.status_tecnico_novo IS NOT NULL THEN
      'Status técnico alterado de "' || sh.status_tecnico_anterior || '" para "' || sh.status_tecnico_novo || '"'
    ELSE
      'Mudança de status registrada'
  END as descricao,
  jsonb_build_object(
    'status', jsonb_build_object('anterior', sh.status_anterior, 'novo', sh.status_novo),
    'status_tecnico', jsonb_build_object('anterior', sh.status_tecnico_anterior, 'novo', sh.status_tecnico_novo),
    'migrado_de', 'status_historico'
  ) as detalhes,
  COALESCE(sh.status_anterior, sh.status_tecnico_anterior) as valor_anterior,
  COALESCE(sh.status_novo, sh.status_tecnico_novo) as valor_novo,
  CASE 
    WHEN sh.status_anterior IS NOT NULL THEN 'status'
    WHEN sh.status_tecnico_anterior IS NOT NULL THEN 'status_tecnico'
    ELSE 'status'
  END as campo_alterado,
  sh.usuario_id,
  COALESCE(sh.usuario_nome, u.nome, 'Sistema') as usuario_nome,
  COALESCE(u.nivel, 'SISTEMA') as usuario_tipo,
  sh.motivo,
  sh.observacoes,
  sh.created_at,
  os.empresa_id
FROM status_historico sh
LEFT JOIN ordens_servico os ON sh.os_id = os.id
LEFT JOIN usuarios u ON sh.usuario_id = u.id
WHERE sh.os_id NOT IN (
  -- Evitar duplicatas se já existir auditoria para esta OS
  SELECT DISTINCT os_id FROM os_auditoria WHERE acao = 'STATUS_CHANGE'
)
ORDER BY sh.created_at;

-- =====================================================
-- 3. VERIFICAR MIGRAÇÃO
-- =====================================================

-- Contar registros migrados
SELECT 
  'Registros migrados' as info,
  COUNT(*) as quantidade
FROM os_auditoria 
WHERE detalhes::text LIKE '%migrado_de%';

-- Comparar totais
SELECT 
  'status_historico' as origem,
  COUNT(*) as total
FROM status_historico
UNION ALL
SELECT 
  'os_auditoria (migrados)' as origem,
  COUNT(*) as total
FROM os_auditoria 
WHERE detalhes::text LIKE '%migrado_de%';

-- =====================================================
-- 4. CRIAR REGISTROS INICIAIS PARA OS SEM HISTÓRICO
-- =====================================================

-- Criar registro inicial para OS que não têm nenhum histórico
INSERT INTO os_auditoria (
  os_id,
  numero_os,
  acao,
  categoria,
  descricao,
  usuario_nome,
  usuario_tipo,
  empresa_id,
  created_at
)
SELECT 
  os.id,
  os.numero_os,
  'OS_CREATED',
  'SISTEMA',
  'Ordem de serviço criada no sistema',
  'Sistema',
  'SISTEMA',
  os.empresa_id,
  os.created_at
FROM ordens_servico os
WHERE os.id NOT IN (
  SELECT DISTINCT os_id FROM os_auditoria
)
ORDER BY os.created_at;

-- =====================================================
-- 5. ESTATÍSTICAS FINAIS
-- =====================================================

-- Estatísticas da migração
SELECT 
  'Total OS no sistema' as metrica,
  COUNT(*) as valor
FROM ordens_servico
UNION ALL
SELECT 
  'OS com auditoria' as metrica,
  COUNT(DISTINCT os_id) as valor
FROM os_auditoria
UNION ALL
SELECT 
  'Total registros auditoria' as metrica,
  COUNT(*) as valor
FROM os_auditoria
UNION ALL
SELECT 
  'Registros migrados' as metrica,
  COUNT(*) as valor
FROM os_auditoria 
WHERE detalhes::text LIKE '%migrado_de%'
UNION ALL
SELECT 
  'Registros criados' as metrica,
  COUNT(*) as valor
FROM os_auditoria 
WHERE acao = 'OS_CREATED';

-- =====================================================
-- 6. COMENTÁRIOS E PRÓXIMOS PASSOS
-- =====================================================

/*
PRÓXIMOS PASSOS APÓS A MIGRAÇÃO:

1. Verificar se todos os dados foram migrados corretamente
2. Testar o novo sistema de auditoria na aplicação
3. Considerar manter ou remover a tabela status_historico antiga
4. Configurar triggers para registrar automaticamente novas ações
5. Treinar usuários no novo sistema de auditoria

NOTA: A tabela status_historico não foi removida para segurança.
Após confirmar que tudo está funcionando, você pode removê-la com:
-- DROP TABLE status_historico;
*/

COMMIT;
