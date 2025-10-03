// Script para testar no console do navegador
// Cole este código no console do navegador (F12 > Console)

console.log('🔍 Testando autenticação no navegador...');

// 1. Verificar sessão atual
supabase.auth.getSession().then(({ data: session, error }) => {
  console.log('📊 Sessão atual:', { session, error });
  console.log('📊 Usuário logado:', session?.session?.user?.id);
});

// 2. Verificar usuário atual
supabase.auth.getUser().then(({ data: user, error }) => {
  console.log('📊 Usuário atual:', { user, error });
});

// 3. Testar query simples
const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';

console.log('🔍 Testando query com empresaId:', empresaId);

// Query de contagem
supabase
  .from('grupos_produtos')
  .select('*', { count: 'exact', head: true })
  .then(({ count, error }) => {
    console.log('📊 Total de grupos (sem filtro):', count, 'Error:', error);
  });

// Query filtrada
supabase
  .from('grupos_produtos')
  .select('*')
  .eq('empresa_id', empresaId)
  .then(({ data, error }) => {
    console.log('📊 Grupos filtrados:', data?.length, 'Error:', error);
    console.log('📊 Dados:', data);
  });

// Query sem filtro (primeiros 5)
supabase
  .from('grupos_produtos')
  .select('*')
  .limit(5)
  .then(({ data, error }) => {
    console.log('📊 Primeiros 5 grupos (sem filtro):', data?.length, 'Error:', error);
    console.log('📊 Dados:', data);
    if (data && data.length > 0) {
      console.log('📊 Empresa IDs encontrados:', [...new Set(data.map(g => g.empresa_id))]);
    }
  });

console.log('✅ Testes iniciados. Aguarde os resultados...');