-- =====================================================
-- RECRIAR POLÍTICAS RLS DE TICKETS (COM FUNÇÃO AUXILIAR)
-- =====================================================
-- Esta versão usa uma função auxiliar para garantir que o contexto
-- de autenticação seja preservado corretamente

-- PASSO 1: Reabilitar RLS
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios ENABLE ROW LEVEL SECURITY;

-- PASSO 2: Criar função auxiliar para obter empresa_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT empresa_id 
  FROM usuarios 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- PASSO 3: Remover TODAS as políticas existentes
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

-- PASSO 4: Criar políticas para tickets_suporte usando a função auxiliar
-- SELECT: Empresas podem ver seus próprios tickets
CREATE POLICY "Empresas podem ver seus tickets" ON tickets_suporte
    FOR SELECT 
    USING (
        empresa_id = get_user_empresa_id()
    );

-- INSERT: Empresas podem criar tickets
CREATE POLICY "Empresas podem criar tickets" ON tickets_suporte
    FOR INSERT 
    WITH CHECK (
        empresa_id = get_user_empresa_id()
    );

-- UPDATE: Empresas podem atualizar seus próprios tickets
CREATE POLICY "Empresas podem atualizar seus tickets" ON tickets_suporte
    FOR UPDATE 
    USING (
        empresa_id = get_user_empresa_id()
    )
    WITH CHECK (
        empresa_id = get_user_empresa_id()
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

-- PASSO 5: Criar políticas para tickets_comentarios
-- SELECT: Empresas podem ver comentários de seus tickets
CREATE POLICY "Empresas podem ver comentários de seus tickets" ON tickets_comentarios
    FOR SELECT 
    USING (
        ticket_id IN (
            SELECT id 
            FROM tickets_suporte 
            WHERE empresa_id = get_user_empresa_id()
        )
    );

-- INSERT: Empresas podem criar comentários em seus tickets
CREATE POLICY "Empresas podem criar comentários" ON tickets_comentarios
    FOR INSERT 
    WITH CHECK (
        ticket_id IN (
            SELECT id 
            FROM tickets_suporte 
            WHERE empresa_id = get_user_empresa_id()
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

-- PASSO 6: Verificar se as políticas foram criadas
SELECT 
    tablename, 
    policyname, 
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'USING definido' ELSE 'USING vazio' END as using_status,
    CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK definido' ELSE 'WITH CHECK vazio' END as with_check_status
FROM pg_policies 
WHERE tablename IN ('tickets_suporte', 'tickets_comentarios')
ORDER BY tablename, policyname;

