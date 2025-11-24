-- =====================================================
-- RECRIAR POLÍTICAS RLS DE TICKETS (VERSÃO FINAL V2)
-- =====================================================
-- Esta versão usa a mesma sintaxe EXATA que funciona em ordens_servico
-- Copiando linha por linha para garantir compatibilidade

-- PASSO 1: Reabilitar RLS
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios ENABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Empresas podem ver seus tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem criar tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem atualizar seus tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Admin SaaS pode ver todos os tickets" ON tickets_suporte;
DROP POLICY IF EXISTS "Empresas podem ver comentários de seus tickets" ON tickets_comentarios;
DROP POLICY IF EXISTS "Empresas podem criar comentários" ON tickets_comentarios;
DROP POLICY IF EXISTS "Admin SaaS pode gerenciar comentários" ON tickets_comentarios;

-- PASSO 3: Criar políticas EXATAMENTE como ordens_servico
-- SELECT: Usuários podem ver tickets da própria empresa
CREATE POLICY "Usuários podem ver tickets da própria empresa" ON tickets_suporte
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- INSERT: Usuários podem inserir tickets na própria empresa
CREATE POLICY "Usuários podem inserir tickets na própria empresa" ON tickets_suporte
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- UPDATE: Usuários podem atualizar tickets da própria empresa
CREATE POLICY "Usuários podem atualizar tickets da própria empresa" ON tickets_suporte
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- DELETE: Usuários podem deletar tickets da própria empresa
CREATE POLICY "Usuários podem deletar tickets da própria empresa" ON tickets_suporte
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
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

-- PASSO 4: Criar políticas para tickets_comentarios (similar a itens_venda)
-- SELECT: Usuários podem ver comentários de tickets da própria empresa
CREATE POLICY "Usuários podem ver comentários de tickets da própria empresa" ON tickets_comentarios
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM tickets_suporte WHERE empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
      )
    )
  );

-- INSERT: Usuários podem inserir comentários em tickets da própria empresa
CREATE POLICY "Usuários podem inserir comentários em tickets da própria empresa" ON tickets_comentarios
  FOR INSERT WITH CHECK (
    ticket_id IN (
      SELECT id FROM tickets_suporte WHERE empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
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

