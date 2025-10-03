const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCategorias() {
  try {
    console.log('🔍 Verificando tabelas de categorias no banco...');
    
    // Verificar se a tabela grupos_produtos existe
    console.log('\n📊 Testando tabela grupos_produtos...');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .limit(5);

    if (gruposError) {
      console.error('❌ Erro ao acessar grupos_produtos:', gruposError);
      if (gruposError.code === 'PGRST116') {
        console.log('💡 A tabela grupos_produtos não existe ou não está acessível');
      }
    } else {
      console.log('✅ Tabela grupos_produtos existe');
      console.log('📊 Total de grupos encontrados:', grupos?.length || 0);
      if (grupos && grupos.length > 0) {
        grupos.forEach((grupo, index) => {
          console.log(`  Grupo ${index + 1}: ${grupo.nome} (Empresa: ${grupo.empresa_id})`);
        });
      }
    }

    // Verificar se a tabela categorias_produtos existe
    console.log('\n📊 Testando tabela categorias_produtos...');
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select('*')
      .limit(5);

    if (categoriasError) {
      console.error('❌ Erro ao acessar categorias_produtos:', categoriasError);
      if (categoriasError.code === 'PGRST116') {
        console.log('💡 A tabela categorias_produtos não existe ou não está acessível');
      }
    } else {
      console.log('✅ Tabela categorias_produtos existe');
      console.log('📊 Total de categorias encontradas:', categorias?.length || 0);
    }

    // Verificar se a tabela subcategorias_produtos existe
    console.log('\n📊 Testando tabela subcategorias_produtos...');
    const { data: subcategorias, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select('*')
      .limit(5);

    if (subcategoriasError) {
      console.error('❌ Erro ao acessar subcategorias_produtos:', subcategoriasError);
      if (subcategoriasError.code === 'PGRST116') {
        console.log('💡 A tabela subcategorias_produtos não existe ou não está acessível');
      }
    } else {
      console.log('✅ Tabela subcategorias_produtos existe');
      console.log('📊 Total de subcategorias encontradas:', subcategorias?.length || 0);
    }

    // Verificar usuários
    console.log('\n👥 Verificando usuários...');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nome, email, empresa_id, auth_user_id')
      .limit(5);

    if (usuariosError) {
      console.error('❌ Erro ao buscar usuários:', usuariosError);
    } else {
      console.log('📊 Usuários encontrados:', usuarios?.length || 0);
      if (usuarios && usuarios.length > 0) {
        usuarios.forEach((usuario, index) => {
          console.log(`  Usuário ${index + 1}: ${usuario.nome} (${usuario.email})`);
          console.log(`    Empresa ID: ${usuario.empresa_id}`);
          console.log(`    Auth User ID: ${usuario.auth_user_id}`);
        });
        
        // Verificar grupos para cada empresa
        const empresasIds = [...new Set(usuarios.map(u => u.empresa_id).filter(Boolean))];
        console.log('\n🔍 Verificando grupos por empresa...');
        
        for (const empresaId of empresasIds) {
          console.log(`\n📊 Grupos para empresa ${empresaId}:`);
          const { data: gruposEmpresa, error: gruposEmpresaError } = await supabase
            .from('grupos_produtos')
            .select('*')
            .eq('empresa_id', empresaId);
            
          if (gruposEmpresaError) {
            console.error(`❌ Erro ao buscar grupos para empresa ${empresaId}:`, gruposEmpresaError);
          } else {
            console.log(`  Total de grupos: ${gruposEmpresa?.length || 0}`);
            if (gruposEmpresa && gruposEmpresa.length > 0) {
              gruposEmpresa.forEach((grupo, index) => {
                console.log(`    Grupo ${index + 1}: ${grupo.nome}`);
              });
            }
          }
        }
      }
    }

    // Verificar empresas para obter um ID válido
    console.log('\n🏢 Verificando empresas...');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome')
      .limit(3);

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError);
    } else {
      console.log('📊 Empresas encontradas:', empresas?.length || 0);
      if (empresas && empresas.length > 0) {
        empresas.forEach((empresa, index) => {
          console.log(`  Empresa ${index + 1}: ${empresa.nome} (ID: ${empresa.id})`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

debugCategorias();