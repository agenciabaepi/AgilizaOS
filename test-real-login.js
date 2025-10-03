const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce'
  }
});

async function testRealLogin() {
  console.log('🔍 TESTE: Tentando login real...\n');
  
  try {
    // 1. Verificar se já existe uma sessão
    console.log('1. Verificando sessão existente...');
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    
    if (existingSession) {
      console.log('✅ Sessão existente encontrada:', existingSession.user.email);
      await testUserData(existingSession.user.id);
      return;
    }
    
    console.log('⚠️ Nenhuma sessão existente');
    
    // 2. Tentar fazer login com credenciais conhecidas
    console.log('\n2. Tentando login com techrodolfo@gmail.com...');
    
    // Nota: Você precisará fornecer a senha real
    const email = 'techrodolfo@gmail.com';
    const password = 'sua_senha_aqui'; // Substitua pela senha real
    
    console.log('⚠️ ATENÇÃO: Este script precisa da senha real para funcionar');
    console.log('   Para testar, você pode:');
    console.log('   1. Substituir a senha no script');
    console.log('   2. Ou fazer login manualmente na aplicação');
    console.log('   3. E então verificar os logs no console do navegador');
    
    // Comentando o login real por segurança
    /*
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    await testUserData(authData.user.id);
    */
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

async function testUserData(userId) {
  console.log('\n3. Testando busca de dados do usuário...');
  console.log('   UserId:', userId);
  
  try {
    // Simular a função fetchUserDataOptimized
    const { data: userData, error: userError } = await supabase
      .from('usuarios_com_empresa')
      .select(`
        empresa_id, nome, email, nivel,
        empresa_nome, empresa_cnpj
      `)
      .eq('auth_user_id', userId)
      .single();
    
    if (userError) {
      console.log('⚠️ Erro na busca otimizada:', userError.message);
      
      // Fallback para busca básica
      const { data: basicData, error: basicError } = await supabase
        .from('usuarios')
        .select('empresa_id, nome, email, nivel')
        .eq('auth_user_id', userId)
        .single();
      
      if (basicError) {
        console.error('❌ Erro na busca básica:', basicError.message);
        return;
      }
      
      console.log('✅ Dados básicos encontrados:', basicData);
      return basicData;
    }
    
    console.log('✅ Dados otimizados encontrados:', userData);
    return userData;
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error);
  }
}

console.log('🔍 INSTRUÇÕES PARA TESTE MANUAL:');
console.log('1. Abra a aplicação em http://localhost:3000');
console.log('2. Faça login com: techrodolfo@gmail.com');
console.log('3. Abra o console do navegador (F12)');
console.log('4. Navegue para /equipamentos/categorias');
console.log('5. Observe os logs de DEBUG que adicionamos');
console.log('6. Verifique se o empresaId está sendo carregado corretamente\n');

testRealLogin();