const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Usando service role para ver as políticas
);

async function checkRLSPolicies() {
  console.log('🔍 Verificando políticas RLS...\n');

  try {
    // Verificar se RLS está habilitado usando SQL direto
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relnamespace', '(SELECT oid FROM pg_namespace WHERE nspname = \'public\')')
      .in('relname', ['grupos_produtos', 'categorias_produtos', 'subcategorias_produtos']);

    console.log('📊 Verificação RLS:', { data: rlsStatus, error: rlsError });

    // Testar query simples primeiro
    console.log('\n🔍 Testando query simples...');
    const { data: count, error: countError } = await supabase
      .from('grupos_produtos')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Total de grupos (service role):', { count, error: countError });

    // Testar query como usuário autenticado
    console.log('\n🔍 Testando query como service role...');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac');

    console.log('📊 Resultado da query (service role):', {
      count: grupos?.length || 0,
      error: gruposError
    });

    if (grupos && grupos.length > 0) {
      console.log('📊 Primeiros grupos encontrados:');
      grupos.slice(0, 3).forEach(grupo => {
        console.log(`  - ${grupo.nome} (ID: ${grupo.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkRLSPolicies();