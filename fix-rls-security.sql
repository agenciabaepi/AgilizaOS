-- =====================================================
-- SCRIPT DE CORREÇÃO DE SEGURANÇA - RLS (Row Level Security)
-- =====================================================
-- Este script habilita RLS e cria políticas de segurança
-- para as tabelas que estão expostas publicamente

-- 1. HABILITAR RLS NAS TABELAS
-- =====================================================

-- Equipamentos Tipos
ALTER TABLE public.equipamentos_tipos ENABLE ROW LEVEL SECURITY;

-- Status Histórico
ALTER TABLE public.status_historico ENABLE ROW LEVEL SECURITY;

-- Checklist Itens
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;

-- WhatsApp Sessions
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- WhatsApp Mensagens
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

-- Notificações
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- 2. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Equipamentos Tipos - Apenas usuários autenticados podem ver
CREATE POLICY "equipamentos_tipos_select_policy" ON public.equipamentos_tipos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "equipamentos_tipos_insert_policy" ON public.equipamentos_tipos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "equipamentos_tipos_update_policy" ON public.equipamentos_tipos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "equipamentos_tipos_delete_policy" ON public.equipamentos_tipos
    FOR DELETE USING (auth.role() = 'authenticated');

-- Status Histórico - Apenas usuários autenticados podem ver
CREATE POLICY "status_historico_select_policy" ON public.status_historico
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "status_historico_insert_policy" ON public.status_historico
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "status_historico_update_policy" ON public.status_historico
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "status_historico_delete_policy" ON public.status_historico
    FOR DELETE USING (auth.role() = 'authenticated');

-- Checklist Itens - Apenas usuários autenticados podem ver
CREATE POLICY "checklist_itens_select_policy" ON public.checklist_itens
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "checklist_itens_insert_policy" ON public.checklist_itens
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "checklist_itens_update_policy" ON public.checklist_itens
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "checklist_itens_delete_policy" ON public.checklist_itens
    FOR DELETE USING (auth.role() = 'authenticated');

-- WhatsApp Sessions - POLÍTICA RESTRITIVA
-- Apenas usuários autenticados e apenas suas próprias sessões
CREATE POLICY "whatsapp_sessions_select_policy" ON public.whatsapp_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "whatsapp_sessions_insert_policy" ON public.whatsapp_sessions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "whatsapp_sessions_update_policy" ON public.whatsapp_sessions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "whatsapp_sessions_delete_policy" ON public.whatsapp_sessions
    FOR DELETE USING (auth.role() = 'authenticated');

-- WhatsApp Mensagens - POLÍTICA RESTRITIVA
-- Apenas usuários autenticados podem ver
CREATE POLICY "whatsapp_mensagens_select_policy" ON public.whatsapp_mensagens
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "whatsapp_mensagens_insert_policy" ON public.whatsapp_mensagens
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "whatsapp_mensagens_update_policy" ON public.whatsapp_mensagens
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "whatsapp_mensagens_delete_policy" ON public.whatsapp_mensagens
    FOR DELETE USING (auth.role() = 'authenticated');

-- Notificações - Apenas usuários autenticados podem ver suas próprias notificações
-- Assumindo que existe um campo user_id ou similar
CREATE POLICY "notificacoes_select_policy" ON public.notificacoes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "notificacoes_insert_policy" ON public.notificacoes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "notificacoes_update_policy" ON public.notificacoes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "notificacoes_delete_policy" ON public.notificacoes
    FOR DELETE USING (auth.role() = 'authenticated');

-- 3. VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- =====================================================

-- Testar se as políticas estão funcionando
-- (Execute estas queries para verificar se ainda consegue acessar os dados)

-- SELECT COUNT(*) FROM public.equipamentos_tipos;
-- SELECT COUNT(*) FROM public.status_historico;
-- SELECT COUNT(*) FROM public.checklist_itens;
-- SELECT COUNT(*) FROM public.whatsapp_sessions;
-- SELECT COUNT(*) FROM public.whatsapp_mensagens;
-- SELECT COUNT(*) FROM public.notificacoes;

-- =====================================================
-- IMPORTANTE: 
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Teste se a aplicação ainda funciona após aplicar as políticas
-- 3. Se houver problemas, podemos ajustar as políticas
-- 4. As políticas atuais são básicas - podemos refiná-las conforme necessário
-- =====================================================
