const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente com service role (admin)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cliente normal (como a aplicação)
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTablePermissions() {
  console.log('🔍 Verificando permissões das tabelas...\n');

  try {
    // 1. Testar com service role (deve funcionar)
    console.log('📊 Teste com SERVICE ROLE:');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac');
    
    console.log(`  - Grupos encontrados: ${adminData?.length || 0}`);
    console.log(`  - Erro: ${adminError ? adminError.message : 'Nenhum'}`);

    // 2. Testar com anon key (como usuário não autenticado)
    console.log('\n📊 Teste com ANON KEY (não autenticado):');
    const { data: anonData, error: anonError } = await supabaseClient
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac');
    
    console.log(`  - Grupos encontrados: ${anonData?.length || 0}`);
    console.log(`  - Erro: ${anonError ? anonError.message : 'Nenhum'}`);

    // 3. Verificar estrutura da tabela
    console.log('\n📊 Estrutura da tabela grupos_produtos:');
    const { data: estrutura, error: estruturaError } = await supabaseAdmin
      .from('grupos_produtos')
      .select('*')
      .limit(1);
    
    if (estrutura && estrutura.length > 0) {
      console.log('  - Colunas:', Object.keys(estrutura[0]));
      console.log('  - Exemplo de registro:', estrutura[0]);
    } else {
      console.log('  - Erro ao obter estrutura:', estruturaError);
    }

    // 4. Verificar se RLS está habilitado (usando query SQL direta)
    console.log('\n📊 Verificando RLS:');
    const { data: rlsCheck, error: rlsError } = await supabaseAdmin
      .rpc('sql', {
        query: `
          SELECT 
            schemaname, 
            tablename, 
            rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('grupos_produtos', 'categorias_produtos', 'subcategorias_produtos')
        `
      });
    
    console.log('  - RLS Status:', { data: rlsCheck, error: rlsError });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkTablePermissions();