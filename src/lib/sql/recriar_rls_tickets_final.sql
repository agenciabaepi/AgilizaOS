-- =====================================================
-- RECRIAR POLÍTICAS RLS DE TICKETS (VERSÃO FINAL)
-- =====================================================
-- Execute este script para recriar todas as políticas RLS
-- Usa a mesma sintaxe que funciona em outras tabelas do sistema

-- Reabilitar RLS (caso tenha sido desabilitado)
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Empresas podem ver seus tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem criar tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem atualizar seus tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Admin SaaS pode ver todos os tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem ver comentários de seus tickets" ON tickets_comentarios;
DROP POLICY IF EXISTS "Empresas podem criar comentários" ON tickets_comentarios;
DROP POLICY IF EXISTS "Admin SaaS pode gerenciar comentários" ON tickets_comentarios;

-- =====================================================
-- POLÍTICAS PARA tickets_suporte
-- =====================================================
-- Usando exatamente a mesma sintaxe que funciona em ordens_servico, clientes, etc.

-- SELECT: Empresas podem ver seus próprios tickets
CREATE POLICY "Empresas podem ver seus tickets" ON tickets_suporte
    FOR SELECT 
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE auth_user_id = auth.uid()
        )
    );

-- INSERT: Empresas podem criar tickets
CREATE POLICY "Empresas podem criar tickets" ON tickets_suporte
    FOR INSERT 
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE auth_user_id = auth.uid()
        )
    );

-- UPDATE: Empresas podem atualizar seus próprios tickets
CREATE POLICY "Empresas podem atualizar seus tickets" ON tickets_suporte
    FOR UPDATE 
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Admin SaaS pode ver e gerenciar todos os tickets
CREATE POLICY "Admin SaaS pode ver todos os tickets" ON tickets_suporte
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 
            FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'admin@admin.com'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'admin@admin.com'
        )
    );

-- =====================================================
-- POLÍTICAS PARA tickets_comentarios
-- =====================================================

-- SELECT: Empresas podem ver comentários de seus tickets
CREATE POLICY "Empresas podem ver comentários de seus tickets" ON tickets_comentarios
    FOR SELECT 
    USING (
        ticket_id IN (
            SELECT id 
            FROM tickets_suporte 
            WHERE empresa_id IN (
                SELECT empresa_id 
                FROM usuarios 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- INSERT: Empresas podem criar comentários em seus tickets
CREATE POLICY "Empresas podem criar comentários" ON tickets_comentarios
    FOR INSERT 
    WITH CHECK (
        ticket_id IN (
            SELECT id 
            FROM tickets_suporte 
            WHERE empresa_id IN (
                SELECT empresa_id 
                FROM usuarios 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Admin SaaS pode ver e criar comentários em todos os tickets
CREATE POLICY "Admin SaaS pode gerenciar comentários" ON tickets_comentarios
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 
            FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'admin@admin.com'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'admin@admin.com'
        )
    );

