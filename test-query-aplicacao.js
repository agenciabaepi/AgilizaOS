require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

// Criar cliente exatamente como na aplicação
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

async function testQueryAplicacao() {
  console.log('🔍 Testando query exatamente como na aplicação...\n');

  const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
  console.log('🏢 Empresa ID:', empresaId);
  console.log('🔧 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase Key (primeiros 10 chars):', supabaseKey.substring(0, 10) + '...');

  try {
    console.log('\n1️⃣ Query exata da aplicação (grupos)...');
    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    console.log('📊 Resultado da query de grupos:');
    console.log('   - Error:', gruposError);
    console.log('   - Data length:', gruposData ? gruposData.length : 0);
    console.log('   - Data:', gruposData);

    console.log('\n2️⃣ Query exata da aplicação (categorias)...');
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select(`
        *,
        grupo:grupos_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    console.log('📊 Resultado da query de categorias:');
    console.log('   - Error:', categoriasError);
    console.log('   - Data length:', categoriasData ? categoriasData.length : 0);
    console.log('   - Data:', categoriasData);

    console.log('\n3️⃣ Query exata da aplicação (subcategorias)...');
    const { data: subcategoriasData, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select(`
        *,
        categoria:categorias_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    console.log('📊 Resultado da query de subcategorias:');
    console.log('   - Error:', subcategoriasError);
    console.log('   - Data length:', subcategoriasData ? subcategoriasData.length : 0);
    console.log('   - Data:', subcategoriasData);

    // Teste adicional: verificar se o problema é com o order
    console.log('\n4️⃣ Teste sem order...');
    const { data: gruposSemOrder, error: gruposSemOrderError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId);

    console.log('📊 Resultado sem order:');
    console.log('   - Error:', gruposSemOrderError);
    console.log('   - Data length:', gruposSemOrder ? gruposSemOrder.length : 0);

    // Teste adicional: verificar se o problema é com o select
    console.log('\n5️⃣ Teste com select específico...');
    const { data: gruposSelectEspecifico, error: gruposSelectEspecificoError } = await supabase
      .from('grupos_produtos')
      .select('id, nome, descricao, empresa_id')
      .eq('empresa_id', empresaId);

    console.log('📊 Resultado com select específico:');
    console.log('   - Error:', gruposSelectEspecificoError);
    console.log('   - Data length:', gruposSelectEspecifico ? gruposSelectEspecifico.length : 0);

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

testQueryAplicacao();