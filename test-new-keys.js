const { createClient } = require('@supabase/supabase-js');

// Testar NOVAS chaves fornecidas pelo usuário
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const newAnonKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';
const newServiceKey = 'sb_secret_3dbdcMGcAy0QzCOOQh4TWg_deFhjsXQ';

console.log('🔍 Testando NOVAS chaves Supabase...');
console.log('URL:', supabaseUrl);
console.log('Nova Anon Key:', newAnonKey.substring(0, 25) + '...');
console.log('Nova Service Key:', newServiceKey.substring(0, 25) + '...');

async function testKeys() {
  console.log('\n📋 Teste 1: Nova Anon Key');
  const supabaseAnon = createClient(supabaseUrl, newAnonKey);
  
  try {
    const { data, error } = await supabaseAnon
      .from('usuarios')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Nova Anon Key - ERRO:', error.message);
    } else {
      console.log('✅ Nova Anon Key - SUCESSO! Conexão funcionando');
    }
  } catch (err) {
    console.log('❌ Nova Anon Key - ERRO CRÍTICO:', err.message);
  }

  console.log('\n📋 Teste 2: Nova Service Key');
  const supabaseService = createClient(supabaseUrl, newServiceKey);
  
  try {
    const { data, error } = await supabaseService
      .from('usuarios')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Nova Service Key - ERRO:', error.message);
    } else {
      console.log('✅ Nova Service Key - SUCESSO! Conexão funcionando');
    }
  } catch (err) {
    console.log('❌ Nova Service Key - ERRO CRÍTICO:', err.message);
  }

  // Teste de autenticação básica
  console.log('\n📋 Teste 3: Auth Sign In (simulado)');
  try {
    const { data, error } = await supabaseAnon.auth.getSession();
    console.log('📊 Auth Status:', error ? 'ERRO: ' + error.message : 'OK - Auth configurado');
  } catch (err) {
    console.log('❌ Auth Test - ERRO:', err.message);
  }
}

testKeys();
