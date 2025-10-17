-- =====================================================
-- CORREÇÃO DE EMERGÊNCIA - ERRO DE AUTORIZAÇÃO
-- =====================================================
-- Este script desabilita temporariamente RLS nas tabelas críticas
-- para restaurar o acesso à aplicação enquanto investigamos o problema.

-- ⚠️ ATENÇÃO: Este script reduz temporariamente a segurança
-- Execute apenas se a aplicação estiver completamente inacessível
-- Depois de restaurar o acesso, investigue e corrija as políticas RLS

-- =====================================================
-- TABELAS CRÍTICAS PARA DESABILITAR RLS TEMPORARIAMENTE
-- =====================================================

-- 1. EMPRESAS (essencial para autenticação)
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empresas_all_policy" ON public.empresas;

-- 2. USUARIOS (essencial para autenticação)
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuarios_all_policy" ON public.usuarios;

-- 3. USER_SESSIONS (essencial para sessões)
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_sessions_all_policy" ON public.user_sessions;

-- 4. ORDENS_SERVICO (página principal)
ALTER TABLE public.ordens_servico DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ordens_servico_all_policy" ON public.ordens_servico;

-- 5. CLIENTES (funcionalidade básica)
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_all_policy" ON public.clientes;

-- 6. VENDAS (funcionalidade financeira)
ALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendas_all_policy" ON public.vendas;

-- 7. STATUS (essencial para OS)
ALTER TABLE public.status DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_all_policy" ON public.status;

-- 8. STATUS_PERSONALIZADOS (essencial para OS)
ALTER TABLE public.status_personalizados DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_personalizados_all_policy" ON public.status_personalizados;

-- 9. PRODUTOS_SERVICOS (catálogo)
ALTER TABLE public.produtos_servicos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "produtos_servicos_all_policy" ON public.produtos_servicos;

-- 10. CATEGORIAS_PRODUTOS (catálogo)
ALTER TABLE public.categorias_produtos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_produtos_all_policy" ON public.categorias_produtos;

-- 11. GRUPOS_PRODUTOS (catálogo)
ALTER TABLE public.grupos_produtos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_produtos_all_policy" ON public.grupos_produtos;

-- 12. SUBCATEGORIAS_PRODUTOS (catálogo)
ALTER TABLE public.subcategorias_produtos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subcategorias_produtos_all_policy" ON public.subcategorias_produtos;

-- 13. FORNECEDORES (funcionalidade básica)
ALTER TABLE public.fornecedores DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fornecedores_all_policy" ON public.fornecedores;

-- 14. CONTAS_PAGAR (funcionalidade financeira)
ALTER TABLE public.contas_pagar DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contas_pagar_all_policy" ON public.contas_pagar;

-- 15. CATEGORIAS_CONTAS (funcionalidade financeira)
ALTER TABLE public.categorias_contas DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_contas_all_policy" ON public.categorias_contas;

-- 16. TIPOS_CONTA (funcionalidade financeira)
ALTER TABLE public.tipos_conta DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_conta_all_policy" ON public.tipos_conta;

-- 17. CLASSIFICACOES_CONTABEIS (funcionalidade financeira)
ALTER TABLE public.classificacoes_contabeis DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classificacoes_contabeis_all_policy" ON public.classificacoes_contabeis;

-- =====================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- =====================================================

-- Verificar se as tabelas críticas estão acessíveis
SELECT 
    'VERIFICAÇÃO DE ACESSO' as status,
    tablename,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'empresas', 'usuarios', 'user_sessions', 'ordens_servico', 
    'clientes', 'vendas', 'status', 'status_personalizados',
    'produtos_servicos', 'categorias_produtos', 'grupos_produtos',
    'subcategorias_produtos', 'fornecedores', 'contas_pagar',
    'categorias_contas', 'tipos_conta', 'classificacoes_contabeis'
)
ORDER BY tablename;

-- =====================================================
-- PRÓXIMOS PASSOS
-- =====================================================
-- 1. Teste se a aplicação voltou a funcionar
-- 2. Se funcionar, execute debug-auth-error.sql para investigar
-- 3. Corrija as políticas RLS uma por uma
-- 4. Re-habilite RLS gradualmente nas tabelas corrigidas
-- 5. Mantenha as tabelas mais críticas sem RLS até ter certeza

-- =====================================================
-- SCRIPT DE REVERSÃO (se necessário)
-- =====================================================
-- Para reverter completamente (NÃO EXECUTE AINDA):
-- 
-- ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "empresas_all_policy" ON public.empresas FOR ALL USING (true);
-- 
-- ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "usuarios_all_policy" ON public.usuarios FOR ALL USING (true);
-- 
-- -- ... (repetir para todas as tabelas)





