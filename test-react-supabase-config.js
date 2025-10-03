const { createClient } = require('@supabase/supabase-js');

// Simular a configuração exata da aplicação React
const supabaseConfig = {
  url: 'https://nxamrvfusyrtkcshehfm.supabase.co',
  anonKey: 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31',
  serviceRoleKey: 'sb_secret_3dbdcMGcAy0QzCOOQh4TWg_deFhjsXQ'
};

// Criar cliente exatamente como na aplicação
const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
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
  }
);

async function testReactConfig() {
  console.log('=== TESTE: Configuração React do Supabase ===\n');
  
  const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
  console.log(`EmpresaId sendo usado: ${empresaId}\n`);

  try {
    // 1. Testar autenticação (como na aplicação)
    console.log('1. Testando obtenção do usuário autenticado...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Erro ao obter usuário:', userError);
      console.log('⚠️  Continuando sem autenticação...\n');
    } else if (user) {
      console.log('✅ Usuário autenticado:', user.id);
      
      // Buscar dados do usuário como na aplicação
      console.log('2. Buscando dados do usuário no banco...');
      const { data: userData, error: userDataError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (userDataError) {
        console.log('❌ Erro ao buscar dados do usuário:', userDataError);
      } else {
        console.log('✅ Dados do usuário:', userData);
        console.log(`📋 EmpresaId do usuário: ${userData.empresa_id}\n`);
      }
    } else {
      console.log('⚠️  Nenhum usuário autenticado\n');
    }

    // 3. Testar query exata da aplicação
    console.log('3. Testando query exata de grupos_produtos...');
    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (gruposError) {
      console.log('❌ Erro ao buscar grupos:', gruposError);
    } else {
      console.log(`✅ Grupos encontrados: ${gruposData.length}`);
      if (gruposData.length > 0) {
        console.log('📋 Primeiros grupos:');
        gruposData.slice(0, 3).forEach((grupo, index) => {
          console.log(`   ${index + 1}. ${grupo.nome} (ID: ${grupo.id})`);
        });
      }
    }

    // 4. Testar query de categorias
    console.log('\n4. Testando query de categorias_produtos...');
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select(`
        *,
        grupo:grupos_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    if (categoriasError) {
      console.log('❌ Erro ao buscar categorias:', categoriasError);
    } else {
      console.log(`✅ Categorias encontradas: ${categoriasData.length}`);
    }

    // 5. Testar query de subcategorias
    console.log('\n5. Testando query de subcategorias_produtos...');
    const { data: subcategoriasData, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select(`
        *,
        categoria:categorias_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    if (subcategoriasError) {
      console.log('❌ Erro ao buscar subcategorias:', subcategoriasError);
    } else {
      console.log(`✅ Subcategorias encontradas: ${subcategoriasData.length}`);
    }

    // 6. Simular comportamento da aplicação
    console.log('\n6. Simulando comportamento da aplicação React...');
    const loading = false;
    const gruposLength = gruposData ? gruposData.length : 0;
    const mostrarMensagem = gruposLength === 0 && !loading;
    
    console.log('Estado simulado da aplicação:');
    console.log(`   - loading: ${loading}`);
    console.log(`   - grupos.length: ${gruposLength}`);
    console.log(`   - Condição para mostrar "Nenhum grupo criado": ${mostrarMensagem}`);
    
    if (mostrarMensagem) {
      console.log('🔍 RESULTADO: A aplicação mostrará "Nenhum grupo criado"');
    } else {
      console.log('🔍 RESULTADO: A aplicação mostrará os grupos encontrados');
    }

  } catch (error) {
    console.log('❌ Erro geral:', error);
  }

  console.log('\n=== Teste concluído ===');
}

testReactConfig();