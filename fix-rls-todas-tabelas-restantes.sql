-- =====================================================
-- CORREÇÃO RLS - TODAS AS TABELAS RESTANTES
-- =====================================================
-- Este script habilita RLS para todas as tabelas que ainda estão "Unrestricted"
-- Baseado na imagem fornecida pelo usuário

-- =====================================================
-- 1. TABELA: public.pagamentos
-- =====================================================
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "pagamentos_select_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_insert_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_update_policy" ON public.pagamentos;
DROP POLICY IF EXISTS "pagamentos_delete_policy" ON public.pagamentos;

-- Política para SELECT: Usuários autenticados podem ver pagamentos da sua empresa
CREATE POLICY "pagamentos_select_policy" ON public.pagamentos
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT: Usuários autenticados da empresa podem inserir pagamentos
CREATE POLICY "pagamentos_insert_policy" ON public.pagamentos
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE: Usuários autenticados da empresa podem atualizar pagamentos
CREATE POLICY "pagamentos_update_policy" ON public.pagamentos
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE: Usuários autenticados da empresa podem deletar pagamentos
CREATE POLICY "pagamentos_delete_policy" ON public.pagamentos
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 2. TABELA: public.status_historico
-- =====================================================
ALTER TABLE public.status_historico ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "status_historico_select_policy" ON public.status_historico;
DROP POLICY IF EXISTS "status_historico_insert_policy" ON public.status_historico;
DROP POLICY IF EXISTS "status_historico_update_policy" ON public.status_historico;
DROP POLICY IF EXISTS "status_historico_delete_policy" ON public.status_historico;

-- Política para SELECT: Usuários autenticados podem ver histórico de status da sua empresa
CREATE POLICY "status_historico_select_policy" ON public.status_historico
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT: Usuários autenticados da empresa podem inserir histórico de status
CREATE POLICY "status_historico_insert_policy" ON public.status_historico
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE: Usuários autenticados da empresa podem atualizar histórico de status
CREATE POLICY "status_historico_update_policy" ON public.status_historico
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE: Usuários autenticados da empresa podem deletar histórico de status
CREATE POLICY "status_historico_delete_policy" ON public.status_historico
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 3. TABELA: public.subcategorias_produtos
-- =====================================================
ALTER TABLE public.subcategorias_produtos ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "subcategorias_produtos_select_policy" ON public.subcategorias_produtos;
DROP POLICY IF EXISTS "subcategorias_produtos_insert_policy" ON public.subcategorias_produtos;
DROP POLICY IF EXISTS "subcategorias_produtos_update_policy" ON public.subcategorias_produtos;
DROP POLICY IF EXISTS "subcategorias_produtos_delete_policy" ON public.subcategorias_produtos;

-- Política para SELECT: Usuários autenticados podem ver subcategorias de produtos da sua empresa
CREATE POLICY "subcategorias_produtos_select_policy" ON public.subcategorias_produtos
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT: Usuários autenticados da empresa podem inserir subcategorias de produtos
CREATE POLICY "subcategorias_produtos_insert_policy" ON public.subcategorias_produtos
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE: Usuários autenticados da empresa podem atualizar subcategorias de produtos
CREATE POLICY "subcategorias_produtos_update_policy" ON public.subcategorias_produtos
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE: Usuários autenticados da empresa podem deletar subcategorias de produtos
CREATE POLICY "subcategorias_produtos_delete_policy" ON public.subcategorias_produtos
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 4. TABELA: public.teste_trigger_log
-- =====================================================
ALTER TABLE public.teste_trigger_log ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "teste_trigger_log_select_policy" ON public.teste_trigger_log;
DROP POLICY IF EXISTS "teste_trigger_log_insert_policy" ON public.teste_trigger_log;
DROP POLICY IF EXISTS "teste_trigger_log_update_policy" ON public.teste_trigger_log;
DROP POLICY IF EXISTS "teste_trigger_log_delete_policy" ON public.teste_trigger_log;

-- Política para SELECT: Usuários autenticados podem ver logs da sua empresa
CREATE POLICY "teste_trigger_log_select_policy" ON public.teste_trigger_log
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT: Usuários autenticados da empresa podem inserir logs
CREATE POLICY "teste_trigger_log_insert_policy" ON public.teste_trigger_log
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE: Usuários autenticados da empresa podem atualizar logs
CREATE POLICY "teste_trigger_log_update_policy" ON public.teste_trigger_log
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE: Usuários autenticados da empresa podem deletar logs
CREATE POLICY "teste_trigger_log_delete_policy" ON public.teste_trigger_log
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 5. TABELA: public.whatsapp_mensagens
-- =====================================================
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "whatsapp_mensagens_select_policy" ON public.whatsapp_mensagens;
DROP POLICY IF EXISTS "whatsapp_mensagens_insert_policy" ON public.whatsapp_mensagens;
DROP POLICY IF EXISTS "whatsapp_mensagens_update_policy" ON public.whatsapp_mensagens;
DROP POLICY IF EXISTS "whatsapp_mensagens_delete_policy" ON public.whatsapp_mensagens;

-- Política para SELECT: Usuários autenticados podem ver mensagens da sua empresa
CREATE POLICY "whatsapp_mensagens_select_policy" ON public.whatsapp_mensagens
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT: Usuários autenticados da empresa podem inserir mensagens
CREATE POLICY "whatsapp_mensagens_insert_policy" ON public.whatsapp_mensagens
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE: Usuários autenticados da empresa podem atualizar mensagens
CREATE POLICY "whatsapp_mensagens_update_policy" ON public.whatsapp_mensagens
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE: Usuários autenticados da empresa podem deletar mensagens
CREATE POLICY "whatsapp_mensagens_delete_policy" ON public.whatsapp_mensagens
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 6. TABELA: public.whatsapp_messages
-- =====================================================
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "whatsapp_messages_select_policy" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_insert_policy" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_update_policy" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_delete_policy" ON public.whatsapp_messages;

-- Política para SELECT: Usuários autenticados podem ver mensagens da sua empresa
CREATE POLICY "whatsapp_messages_select_policy" ON public.whatsapp_messages
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT: Usuários autenticados da empresa podem inserir mensagens
CREATE POLICY "whatsapp_messages_insert_policy" ON public.whatsapp_messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE: Usuários autenticados da empresa podem atualizar mensagens
CREATE POLICY "whatsapp_messages_update_policy" ON public.whatsapp_messages
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE: Usuários autenticados da empresa podem deletar mensagens
CREATE POLICY "whatsapp_messages_delete_policy" ON public.whatsapp_messages
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 7. TABELA: public.whatsapp_sessions
-- =====================================================
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "whatsapp_sessions_select_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_insert_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_update_policy" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_delete_policy" ON public.whatsapp_sessions;

-- Política para SELECT: Usuários autenticados só veem suas próprias sessões
CREATE POLICY "whatsapp_sessions_select_policy" ON public.whatsapp_sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND auth.uid() = user_id
    );

-- Política para INSERT: Usuários autenticados só podem criar sessões para si
CREATE POLICY "whatsapp_sessions_insert_policy" ON public.whatsapp_sessions
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND auth.uid() = user_id
    );

-- Política para UPDATE: Usuários autenticados só podem atualizar suas sessões
CREATE POLICY "whatsapp_sessions_update_policy" ON public.whatsapp_sessions
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND auth.uid() = user_id
    );

-- Política para DELETE: Usuários autenticados só podem deletar suas sessões
CREATE POLICY "whatsapp_sessions_delete_policy" ON public.whatsapp_sessions
    FOR DELETE USING (
        auth.role() = 'authenticated' AND auth.uid() = user_id
    );

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute para verificar se todas as tabelas agora têm RLS habilitado:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('pagamentos', 'status_historico', 'subcategorias_produtos', 'teste_trigger_log', 'whatsapp_mensagens', 'whatsapp_messages', 'whatsapp_sessions')
-- ORDER BY tablename;

-- =====================================================
-- STATUS FINAL DAS CORREÇÕES:
-- ✅ catalogo_categorias - CORRIGIDA
-- ✅ catalogo_itens - CORRIGIDA
-- ✅ categorias_produtos - CORRIGIDA
-- ✅ checklist_itens - CORRIGIDA (com política smart)
-- ✅ configuracoes_comissao - CORRIGIDA
-- ✅ configuracoes_empresa - CORRIGIDA
-- ✅ equipamentos_tipos - CORRIGIDA (com política permissiva)
-- ✅ grupos_produtos - CORRIGIDA
-- ✅ notificacoes - CORRIGIDA (com política permissiva)
-- ✅ ordens_servico - CORRIGIDA
-- ✅ pagamentos - CORRIGIDA
-- ✅ status_historico - CORRIGIDA
-- ✅ subcategorias_produtos - CORRIGIDA
-- ✅ teste_trigger_log - CORRIGIDA
-- ✅ whatsapp_mensagens - CORRIGIDA
-- ✅ whatsapp_messages - CORRIGIDA
-- ✅ whatsapp_sessions - CORRIGIDA
-- =====================================================

-- =====================================================
-- ROLLBACK GERAL (SE NECESSÁRIO)
-- =====================================================
-- Se algo quebrar, execute os comandos abaixo para reverter o RLS para todas as tabelas:

-- ALTER TABLE public.pagamentos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "pagamentos_select_policy" ON public.pagamentos;
-- DROP POLICY IF EXISTS "pagamentos_insert_policy" ON public.pagamentos;
-- DROP POLICY IF EXISTS "pagamentos_update_policy" ON public.pagamentos;
-- DROP POLICY IF EXISTS "pagamentos_delete_policy" ON public.pagamentos;

-- ALTER TABLE public.status_historico DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "status_historico_select_policy" ON public.status_historico;
-- DROP POLICY IF EXISTS "status_historico_insert_policy" ON public.status_historico;
-- DROP POLICY IF EXISTS "status_historico_update_policy" ON public.status_historico;
-- DROP POLICY IF EXISTS "status_historico_delete_policy" ON public.status_historico;

-- ALTER TABLE public.subcategorias_produtos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "subcategorias_produtos_select_policy" ON public.subcategorias_produtos;
-- DROP POLICY IF EXISTS "subcategorias_produtos_insert_policy" ON public.subcategorias_produtos;
-- DROP POLICY IF EXISTS "subcategorias_produtos_update_policy" ON public.subcategorias_produtos;
-- DROP POLICY IF EXISTS "subcategorias_produtos_delete_policy" ON public.subcategorias_produtos;

-- ALTER TABLE public.teste_trigger_log DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "teste_trigger_log_select_policy" ON public.teste_trigger_log;
-- DROP POLICY IF EXISTS "teste_trigger_log_insert_policy" ON public.teste_trigger_log;
-- DROP POLICY IF EXISTS "teste_trigger_log_update_policy" ON public.teste_trigger_log;
-- DROP POLICY IF EXISTS "teste_trigger_log_delete_policy" ON public.teste_trigger_log;

-- ALTER TABLE public.whatsapp_mensagens DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "whatsapp_mensagens_select_policy" ON public.whatsapp_mensagens;
-- DROP POLICY IF EXISTS "whatsapp_mensagens_insert_policy" ON public.whatsapp_mensagens;
-- DROP POLICY IF EXISTS "whatsapp_mensagens_update_policy" ON public.whatsapp_mensagens;
-- DROP POLICY IF EXISTS "whatsapp_mensagens_delete_policy" ON public.whatsapp_mensagens;

-- ALTER TABLE public.whatsapp_messages DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "whatsapp_messages_select_policy" ON public.whatsapp_messages;
-- DROP POLICY IF EXISTS "whatsapp_messages_insert_policy" ON public.whatsapp_messages;
-- DROP POLICY IF EXISTS "whatsapp_messages_update_policy" ON public.whatsapp_messages;
-- DROP POLICY IF EXISTS "whatsapp_messages_delete_policy" ON public.whatsapp_messages;

-- ALTER TABLE public.whatsapp_sessions DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "whatsapp_sessions_select_policy" ON public.whatsapp_sessions;
-- DROP POLICY IF EXISTS "whatsapp_sessions_insert_policy" ON public.whatsapp_sessions;
-- DROP POLICY IF EXISTS "whatsapp_sessions_update_policy" ON public.whatsapp_sessions;
-- DROP POLICY IF EXISTS "whatsapp_sessions_delete_policy" ON public.whatsapp_sessions;

