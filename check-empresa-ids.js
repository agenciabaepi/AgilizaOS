const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkEmpresaIds() {
  console.log('🔍 Verificando empresa_ids existentes...\n');

  try {
    // 1. Verificar empresa_ids únicos na tabela grupos_produtos
    console.log('📊 Empresa IDs únicos em grupos_produtos:');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('empresa_id, nome');
    
    if (gruposError) {
      console.error('❌ Erro ao buscar grupos:', gruposError);
      return;
    }

    const empresaIds = [...new Set(grupos.map(g => g.empresa_id))];
    console.log(`  - Total de empresa_ids únicos: ${empresaIds.length}`);
    empresaIds.forEach((id, index) => {
      const gruposCount = grupos.filter(g => g.empresa_id === id).length;
      console.log(`  ${index + 1}. ${id} (${gruposCount} grupos)`);
    });

    // 2. Verificar se existe tabela empresas
    console.log('\n📊 Verificando tabela empresas:');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome');
    
    if (empresasError) {
      console.log('  ⚠️  Tabela empresas não encontrada ou erro:', empresasError.message);
    } else {
      console.log(`  - Total de empresas: ${empresas.length}`);
      empresas.forEach((empresa, index) => {
        console.log(`  ${index + 1}. ${empresa.id} - ${empresa.nome}`);
      });
    }

    // 3. Verificar tabela usuarios
    console.log('\n📊 Verificando tabela usuarios:');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nome, empresa_id, auth_user_id');
    
    if (usuariosError) {
      console.log('  ⚠️  Tabela usuarios não encontrada ou erro:', usuariosError.message);
    } else {
      console.log(`  - Total de usuários: ${usuarios.length}`);
      usuarios.forEach((usuario, index) => {
        console.log(`  ${index + 1}. ${usuario.nome} - empresa_id: ${usuario.empresa_id} - auth_id: ${usuario.auth_user_id}`);
      });
    }

    // 4. O empresa_id que a aplicação está usando
    const empresaIdAplicacao = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
    console.log(`\n📊 Verificando empresa_id da aplicação: ${empresaIdAplicacao}`);
    
    const existeEmGrupos = grupos.some(g => g.empresa_id === empresaIdAplicacao);
    console.log(`  - Existe em grupos_produtos: ${existeEmGrupos ? 'SIM' : 'NÃO'}`);
    
    if (empresas) {
      const existeEmEmpresas = empresas.some(e => e.id === empresaIdAplicacao);
      console.log(`  - Existe em empresas: ${existeEmEmpresas ? 'SIM' : 'NÃO'}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkEmpresaIds();