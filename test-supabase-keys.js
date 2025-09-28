const { createClient } = require('@supabase/supabase-js');

// Testar chaves atuais
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const anonKey = 'sb_publishable_yeCVZkUfO6Rut3Vr4EDzq5Ci9h7l1lUrukCwJMITS';
const serviceKey = 'sb_secret_3dbdcMGcAyk8vN9ruzVRmZDjHRBAZEjt20fMCt4ClIzrhlLJ8PmcdLOFRIxd29hAGGWIX7W2lTUZjNJis';

console.log('🔍 Testando chaves Supabase...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', anonKey.substring(0, 20) + '...');
console.log('Service Key:', serviceKey.substring(0, 20) + '...');

// Testar com anon key
console.log('\n📋 Teste 1: Anon Key');
const supabaseAnon = createClient(supabaseUrl, anonKey);

supabaseAnon
  .from('usuarios')
  .select('count')
  .single()
  .then(({ data, error }) => {
    if (error) {
      console.log('❌ Anon Key - ERRO:', error.message);
    } else {
      console.log('✅ Anon Key - SUCESSO');
    }
  });

// Testar com service key
console.log('\n📋 Teste 2: Service Key');
const supabaseService = createClient(supabaseUrl, serviceKey);

supabaseService
  .from('usuarios')
  .select('count')
  .single()
  .then(({ data, error }) => {
    if (error) {
      console.log('❌ Service Key - ERRO:', error.message);
    } else {
      console.log('✅ Service Key - SUCESSO');
    }
  });

// Teste básico de conectividade
console.log('\n🌐 Teste 3: Conectividade básica');
fetch(supabaseUrl + '/rest/v1/')
  .then(response => {
    console.log('📡 Status da API:', response.status);
    return response.text();
  })
  .then(text => {
    console.log('📝 Resposta:', text.substring(0, 100) + '...');
  })
  .catch(error => {
    console.log('❌ Erro de conectividade:', error.message);
  });
