-- =====================================================
-- MIGRAÇÃO: Sincronizar coluna plano da tabela empresas
-- com as assinaturas ativas
-- =====================================================
-- 
-- Este script atualiza a coluna 'plano' na tabela empresas
-- baseado nas assinaturas ativas, mantendo compatibilidade
-- com código legado que ainda usa essa coluna
-- =====================================================

-- Atualizar coluna plano nas empresas baseado na assinatura ativa
UPDATE empresas e
SET plano = LOWER(p.nome)
FROM assinaturas a
JOIN planos p ON a.plano_id = p.id
WHERE a.empresa_id = e.id
  AND a.status IN ('active', 'trial')
  AND (a.data_fim IS NULL OR a.data_fim > NOW())
  AND a.id = (
    SELECT id 
    FROM assinaturas 
    WHERE empresa_id = e.id 
      AND status IN ('active', 'trial')
      AND (data_fim IS NULL OR data_fim > NOW())
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Para empresas sem assinatura, manter valor atual ou definir como 'unico'
-- (não alterar se já tem valor)
UPDATE empresas
SET plano = 'unico'
WHERE plano IS NULL 
  AND id NOT IN (
    SELECT DISTINCT empresa_id 
    FROM assinaturas 
    WHERE status IN ('active', 'trial')
      AND (data_fim IS NULL OR data_fim > NOW())
  );

-- Verificar resultado
SELECT 
  e.id,
  e.nome,
  e.plano as plano_empresa,
  p.nome as plano_assinatura,
  a.status as status_assinatura
FROM empresas e
LEFT JOIN assinaturas a ON a.empresa_id = e.id 
  AND a.status IN ('active', 'trial')
  AND (a.data_fim IS NULL OR a.data_fim > NOW())
  AND a.id = (
    SELECT id 
    FROM assinaturas 
    WHERE empresa_id = e.id 
      AND status IN ('active', 'trial')
      AND (data_fim IS NULL OR data_fim > NOW())
    ORDER BY created_at DESC 
    LIMIT 1
  )
LEFT JOIN planos p ON a.plano_id = p.id
ORDER BY e.nome
LIMIT 20;

