-- =====================================================
-- CORRIGIR POLÍTICAS RLS DE TICKETS
-- =====================================================
-- Execute este script se já executou criar_tickets_suporte.sql
-- e as políticas RLS estão usando 'id' em vez de 'auth_user_id'

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Empresas podem ver seus tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem criar tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem atualizar seus tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem ver comentários de seus tickets" ON tickets_comentarios;
DROP POLICY IF EXISTS "Empresas podem criar comentários" ON tickets_comentarios;

-- Criar políticas corretas
-- Políticas RLS para tickets_suporte
CREATE POLICY "Empresas podem ver seus tickets" ON tickets_suporte
    FOR SELECT USING (
        empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Empresas podem criar tickets" ON tickets_suporte
    FOR INSERT WITH CHECK (
        empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Empresas podem atualizar seus tickets" ON tickets_suporte
    FOR UPDATE USING (
        empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    ) WITH CHECK (
        empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    );

-- Políticas RLS para tickets_comentarios
CREATE POLICY "Empresas podem ver comentários de seus tickets" ON tickets_comentarios
    FOR SELECT USING (
        ticket_id IN (
            SELECT id FROM tickets_suporte 
            WHERE empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY "Empresas podem criar comentários" ON tickets_comentarios
    FOR INSERT WITH CHECK (
        ticket_id IN (
            SELECT id FROM tickets_suporte 
            WHERE empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
        )
    );

