const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEmpresa() {
  try {
    console.log('🔍 Verificando dados de empresa no banco...');
    
    // Buscar todas as empresas
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('*');

    if (error) {
      console.error('❌ Erro ao buscar empresas:', error);
      return;
    }

    console.log('📊 Total de empresas encontradas:', empresas?.length || 0);
    
    if (empresas && empresas.length > 0) {
      empresas.forEach((empresa, index) => {
        console.log(`\n🏢 Empresa ${index + 1}:`);
        console.log('  ID:', empresa.id);
        console.log('  Nome:', empresa.nome);
        console.log('  User ID:', empresa.user_id);
        console.log('  Logo URL:', empresa.logo_url);
        console.log('  CNPJ:', empresa.cnpj);
      });
    } else {
      console.log('❌ Nenhuma empresa encontrada no banco de dados');
    }

    // Verificar usuários
    console.log('\n👥 Verificando usuários...');
    const { data: usuarios, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, nome');

    if (userError) {
      console.error('❌ Erro ao buscar usuários:', userError);
    } else {
      console.log('📊 Total de usuários encontrados:', usuarios?.length || 0);
      if (usuarios && usuarios.length > 0) {
        usuarios.forEach((usuario, index) => {
          console.log(`  Usuário ${index + 1}: ${usuario.nome} (${usuario.email}) - ID: ${usuario.id}`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

debugEmpresa();