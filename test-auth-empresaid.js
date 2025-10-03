const { createClient } = require('@supabase/supabase-js');

// Configuração exata da aplicação
const supabaseConfig = {
  url: 'https://nxamrvfusyrtkcshehfm.supabase.co',
  anonKey: 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31',
  serviceRoleKey: 'sb_secret_3dbdcMGcAy0QzCOOQh4TWg_deFhjsXQ'
};

const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);

async function testAuthFlow() {
  console.log('=== TESTE: Fluxo de Autenticação e EmpresaId ===\n');

  try {
    // 1. Verificar se há sessão ativa
    console.log('1. Verificando sessão ativa...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Erro ao obter sessão:', sessionError);
    } else if (session) {
      console.log('✅ Sessão ativa encontrada');
      console.log(`   User ID: ${session.user.id}`);
      console.log(`   Email: ${session.user.email}`);
    } else {
      console.log('⚠️  Nenhuma sessão ativa');
    }

    // 2. Tentar obter usuário atual
    console.log('\n2. Obtendo usuário atual...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Erro ao obter usuário:', userError.message);
      console.log('⚠️  Simulando com usuário conhecido...\n');
      
      // Simular com um usuário conhecido do banco
      await testWithKnownUser();
      return;
    }

    if (!user) {
      console.log('⚠️  Nenhum usuário autenticado');
      console.log('⚠️  Simulando com usuário conhecido...\n');
      await testWithKnownUser();
      return;
    }

    console.log('✅ Usuário autenticado:', user.id);

    // 3. Buscar dados do usuário no banco
    console.log('\n3. Buscando dados do usuário no banco...');
    const { data: userData, error: userDataError } = await supabase
      .from('usuarios')
      .select('empresa_id, nome, email, nivel')
      .eq('auth_user_id', user.id)
      .single();

    if (userDataError) {
      console.log('❌ Erro ao buscar dados do usuário:', userDataError);
      console.log('⚠️  Simulando com usuário conhecido...\n');
      await testWithKnownUser();
      return;
    }

    if (!userData) {
      console.log('❌ Dados do usuário não encontrados');
      console.log('⚠️  Simulando com usuário conhecido...\n');
      await testWithKnownUser();
      return;
    }

    console.log('✅ Dados do usuário encontrados:');
    console.log(`   Nome: ${userData.nome}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Nível: ${userData.nivel}`);
    console.log(`   EmpresaId: ${userData.empresa_id}`);

    // 4. Testar query com o empresaId obtido
    await testQueryWithEmpresaId(userData.empresa_id);

  } catch (error) {
    console.log('❌ Erro geral no fluxo de autenticação:', error);
    console.log('⚠️  Simulando com usuário conhecido...\n');
    await testWithKnownUser();
  }
}

async function testWithKnownUser() {
  console.log('=== SIMULAÇÃO: Testando com usuário conhecido ===\n');
  
  try {
    // Buscar um usuário existente no banco
    console.log('1. Buscando usuários existentes...');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('auth_user_id, empresa_id, nome, email, nivel')
      .limit(5);

    if (usuariosError) {
      console.log('❌ Erro ao buscar usuários:', usuariosError);
      return;
    }

    if (!usuarios || usuarios.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco');
      return;
    }

    console.log(`✅ Encontrados ${usuarios.length} usuários`);
    
    // Usar o primeiro usuário
    const usuario = usuarios[0];
    console.log('\n2. Usando primeiro usuário encontrado:');
    console.log(`   Nome: ${usuario.nome}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   EmpresaId: ${usuario.empresa_id}`);

    // Testar query com este empresaId
    await testQueryWithEmpresaId(usuario.empresa_id);

  } catch (error) {
    console.log('❌ Erro na simulação:', error);
  }
}

async function testQueryWithEmpresaId(empresaId) {
  console.log(`\n=== TESTE: Query com EmpresaId ${empresaId} ===\n`);

  try {
    // Simular exatamente a query da página de categorias
    console.log('1. Testando query de grupos_produtos...');
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

    // 2. Simular o comportamento da aplicação
    console.log('\n2. Simulando comportamento da aplicação...');
    const loading = false;
    const gruposLength = gruposData ? gruposData.length : 0;
    const mostrarMensagem = gruposLength === 0 && !loading;
    
    console.log('Estado da aplicação:');
    console.log(`   - loading: ${loading}`);
    console.log(`   - grupos.length: ${gruposLength}`);
    console.log(`   - empresaId: ${empresaId}`);
    console.log(`   - Condição (grupos.length === 0 && !loading): ${mostrarMensagem}`);
    
    if (mostrarMensagem) {
      console.log('\n🔍 RESULTADO: A aplicação mostrará "Nenhum grupo criado"');
      console.log('❌ PROBLEMA IDENTIFICADO: Não há grupos para este empresaId');
    } else {
      console.log('\n🔍 RESULTADO: A aplicação mostrará os grupos encontrados');
      console.log('✅ SUCESSO: Grupos existem e deveriam aparecer na tela');
    }

    // 3. Verificar se o empresaId é válido
    console.log('\n3. Verificando validade do empresaId...');
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('id', empresaId)
      .single();

    if (empresaError) {
      console.log('❌ Erro ao verificar empresa:', empresaError);
      console.log('⚠️  EmpresaId pode ser inválido!');
    } else if (empresaData) {
      console.log('✅ Empresa válida encontrada:');
      console.log(`   ID: ${empresaData.id}`);
      console.log(`   Nome: ${empresaData.nome}`);
    }

  } catch (error) {
    console.log('❌ Erro no teste de query:', error);
  }

  console.log('\n=== Teste concluído ===');
}

testAuthFlow();