-- =====================================================
-- RECRIAR POLÍTICAS RLS DE TICKETS (VERSÃO SIMPLIFICADA)
-- =====================================================
-- Execute este script para recriar todas as políticas RLS
-- Versão simplificada que força a recriação completa

-- PASSO 1: Reabilitar RLS
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios ENABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas existentes (forçar remoção)
DO $$ 
BEGIN
    -- Remover políticas de tickets_suporte
    DROP POLICY IF EXISTS "Empresas podem ver seus tickets" ON tickets_suporte;
    DROP POLICY IF EXISTS "Empresas podem criar tickets" ON tickets_suporte;
    DROP POLICY IF EXISTS "Empresas podem atualizar seus tickets" ON tickets_suporte;
    DROP POLICY IF EXISTS "Admin SaaS pode ver todos os tickets" ON tickets_suporte;
    
    -- Remover políticas de tickets_comentarios
    DROP POLICY IF EXISTS "Empresas podem ver comentários de seus tickets" ON tickets_comentarios;
    DROP POLICY IF EXISTS "Empresas podem criar comentários" ON tickets_comentarios;
    DROP POLICY IF EXISTS "Admin SaaS pode gerenciar comentários" ON tickets_comentarios;
END $$;

-- PASSO 3: Criar políticas para tickets_suporte
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

-- PASSO 4: Criar políticas para tickets_comentarios
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

-- PASSO 5: Verificar se as políticas foram criadas
SELECT 
    tablename, 
    policyname, 
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'USING definido' ELSE 'USING vazio' END as using_status,
    CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK definido' ELSE 'WITH CHECK vazio' END as with_check_status
FROM pg_policies 
WHERE tablename IN ('tickets_suporte', 'tickets_comentarios')
ORDER BY tablename, policyname;

