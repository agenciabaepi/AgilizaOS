-- =====================================================
-- RECRIAR POLÍTICAS RLS DE TICKETS (VERSÃO DEBUG)
-- =====================================================
-- Esta versão adiciona verificações explícitas para debug

-- PASSO 1: Reabilitar RLS
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios ENABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver tickets da própria empresa" ON tickets_suporte;
DROP POLICY IF EXISTS "Usuários podem inserir tickets na própria empresa" ON tickets_suporte;
DROP POLICY IF EXISTS "Usuários podem atualizar tickets da própria empresa" ON tickets_suporte;
DROP POLICY IF EXISTS "Usuários podem deletar tickets da própria empresa" ON tickets_suporte;
DROP POLICY IF EXISTS "Admin SaaS pode ver todos os tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem ver seus tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem criar tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem atualizar seus tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Usuários podem ver comentários de tickets da própria empresa" ON tickets_comentarios;
DROP POLICY IF EXISTS "Usuários podem inserir comentários em tickets da própria empresa" ON tickets_comentarios;
DROP POLICY IF EXISTS "Admin SaaS pode gerenciar comentários" ON tickets_comentarios;
DROP POLICY IF EXISTS "Empresas podem ver comentários de seus tickets" ON tickets_comentarios;
DROP POLICY IF EXISTS "Empresas podem criar comentários" ON tickets_comentarios;

-- PASSO 3: Criar função auxiliar para debug (opcional, pode ajudar)
CREATE OR REPLACE FUNCTION auth_user_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT empresa_id INTO result
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- PASSO 4: Criar políticas usando a função auxiliar
-- SELECT: Usuários podem ver tickets da própria empresa
CREATE POLICY "Usuários podem ver tickets da própria empresa" ON tickets_suporte
  FOR SELECT 
  USING (
    empresa_id = auth_user_empresa_id()
  );

-- INSERT: Usuários podem inserir tickets na própria empresa
CREATE POLICY "Usuários podem inserir tickets na própria empresa" ON tickets_suporte
  FOR INSERT 
  WITH CHECK (
    empresa_id = auth_user_empresa_id()
  );

-- UPDATE: Usuários podem atualizar tickets da própria empresa
CREATE POLICY "Usuários podem atualizar tickets da própria empresa" ON tickets_suporte
  FOR UPDATE 
  USING (
    empresa_id = auth_user_empresa_id()
  )
  WITH CHECK (
    empresa_id = auth_user_empresa_id()
  );

-- DELETE: Usuários podem deletar tickets da própria empresa
CREATE POLICY "Usuários podem deletar tickets da própria empresa" ON tickets_suporte
  FOR DELETE 
  USING (
    empresa_id = auth_user_empresa_id()
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
CREATE POLICY "Usuários podem ver comentários de tickets da própria empresa" ON tickets_comentarios
  FOR SELECT 
  USING (
    ticket_id IN (
      SELECT id 
      FROM tickets_suporte 
      WHERE empresa_id = auth_user_empresa_id()
    )
  );

CREATE POLICY "Usuários podem inserir comentários em tickets da própria empresa" ON tickets_comentarios
  FOR INSERT 
  WITH CHECK (
    ticket_id IN (
      SELECT id 
      FROM tickets_suporte 
      WHERE empresa_id = auth_user_empresa_id()
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

-- PASSO 6: Verificar políticas criadas
SELECT 
    tablename, 
    policyname, 
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'USING definido' ELSE 'USING vazio' END as using_status,
    CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK definido' ELSE 'WITH CHECK vazio' END as with_check_status
FROM pg_policies 
WHERE tablename IN ('tickets_suporte', 'tickets_comentarios')
ORDER BY tablename, policyname;

