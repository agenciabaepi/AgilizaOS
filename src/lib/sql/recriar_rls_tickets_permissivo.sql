-- =====================================================
-- RECRIAR POLÍTICAS RLS DE TICKETS (VERSÃO PERMISSIVA PARA TESTE)
-- =====================================================
-- Esta versão é mais permissiva para testar se o problema é com auth.uid()
-- ou com a lógica de verificação de empresa

-- PASSO 1: Reabilitar RLS
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios ENABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas existentes
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Empresas podem ver seus tickets" ON tickets_suporte;
    DROP POLICY IF EXISTS "Empresas podem criar tickets" ON tickets_suporte;
    DROP POLICY IF EXISTS "Empresas podem atualizar seus tickets" ON tickets_suporte;
    DROP POLICY IF EXISTS "Admin SaaS pode ver todos os tickets" ON tickets_suporte;
    DROP POLICY IF EXISTS "Empresas podem ver comentários de seus tickets" ON tickets_comentarios;
    DROP POLICY IF EXISTS "Empresas podem criar comentários" ON tickets_comentarios;
    DROP POLICY IF EXISTS "Admin SaaS pode gerenciar comentários" ON tickets_comentarios;
END $$;

-- PASSO 3: Criar políticas PERMISSIVAS para testar
-- Primeiro, vamos permitir acesso se o usuário estiver autenticado
-- (isso vai nos ajudar a identificar se o problema é com auth.uid() ou com a lógica)

-- SELECT: Permitir se usuário autenticado E empresa_id corresponde
CREATE POLICY "Empresas podem ver seus tickets" ON tickets_suporte
    FOR SELECT 
    USING (
        -- Verificar se há usuário autenticado
        auth.uid() IS NOT NULL
        AND
        -- Verificar se empresa_id corresponde
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE auth_user_id = auth.uid()
        )
    );

-- INSERT: Permitir se usuário autenticado E empresa_id corresponde
CREATE POLICY "Empresas podem criar tickets" ON tickets_suporte
    FOR INSERT 
    WITH CHECK (
        -- Verificar se há usuário autenticado
        auth.uid() IS NOT NULL
        AND
        -- Verificar se empresa_id corresponde
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE auth_user_id = auth.uid()
        )
    );

-- UPDATE: Permitir se usuário autenticado E empresa_id corresponde
CREATE POLICY "Empresas podem atualizar seus tickets" ON tickets_suporte
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL
        AND
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND
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
CREATE POLICY "Empresas podem ver comentários de seus tickets" ON tickets_comentarios
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL
        AND
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

CREATE POLICY "Empresas podem criar comentários" ON tickets_comentarios
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND
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

