-- =====================================================
-- CORRIGIR COMISSÕES ANTIGAS DE TÉCNICOS DESATIVADOS
-- =====================================================
-- Este script identifica e corrige comissões que foram registradas
-- para técnicos que agora têm comissao_ativa = false
--
-- IMPORTANTE: Este script NÃO deleta comissões, apenas marca como inativas
-- para preservar o histórico financeiro. Se preferir deletar, ajuste o script.

-- 1. VERIFICAR COMISSÕES DE TÉCNICOS DESATIVADOS
-- =====================================================
-- Mostra quantas comissões serão afetadas
SELECT 
    COUNT(*) as total_comissoes_afetadas,
    SUM(ch.valor_comissao) as total_valor_afetado
FROM comissoes_historico ch
INNER JOIN usuarios u ON u.id = ch.tecnico_id
WHERE u.comissao_ativa = false
AND (ch.ativa IS NULL OR ch.ativa = true);

-- 2. VER DETALHES DAS COMISSÕES QUE SERÃO CORRIGIDAS
-- =====================================================
SELECT 
    ch.id,
    ch.ordem_servico_id,
    u.nome as tecnico_nome,
    u.comissao_ativa,
    ch.valor_comissao,
    ch.status,
    ch.data_entrega,
    ch.ativa as comissao_ativa_atual
FROM comissoes_historico ch
INNER JOIN usuarios u ON u.id = ch.tecnico_id
WHERE u.comissao_ativa = false
AND (ch.ativa IS NULL OR ch.ativa = true)
ORDER BY ch.data_entrega DESC
LIMIT 50; -- Mostrar apenas as 50 primeiras para verificação

-- 3. MARCAR COMISSÕES COMO INATIVAS (PRESERVA HISTÓRICO)
-- =====================================================
-- Esta query marca as comissões de técnicos desativados como inativas
-- Isso permite manter o histórico mas não incluir nos cálculos
UPDATE comissoes_historico ch
SET ativa = false
FROM usuarios u
WHERE ch.tecnico_id = u.id
AND u.comissao_ativa = false
AND (ch.ativa IS NULL OR ch.ativa = true);

-- Verificar quantas foram atualizadas
SELECT 
    COUNT(*) as comissoes_marcadas_como_inativas
FROM comissoes_historico ch
INNER JOIN usuarios u ON u.id = ch.tecnico_id
WHERE u.comissao_ativa = false
AND ch.ativa = false;

-- 4. ALTERNATIVA: DELETAR COMISSÕES (DESCOMENTE APENAS SE DESEJAR)
-- =====================================================
-- ATENÇÃO: Esta opção DELETA permanentemente as comissões
-- Use apenas se tiver certeza que não precisa do histórico
/*
DELETE FROM comissoes_historico ch
USING usuarios u
WHERE ch.tecnico_id = u.id
AND u.comissao_ativa = false;
*/

-- 5. VERIFICAR RESULTADO FINAL
-- =====================================================
-- Mostrar resumo: comissões ativas vs inativas por status de técnico
SELECT 
    u.comissao_ativa as tecnico_comissao_ativa,
    ch.ativa as comissao_ativa,
    COUNT(*) as quantidade,
    SUM(ch.valor_comissao) as total_valor
FROM comissoes_historico ch
INNER JOIN usuarios u ON u.id = ch.tecnico_id
GROUP BY u.comissao_ativa, ch.ativa
ORDER BY u.comissao_ativa, ch.ativa;
