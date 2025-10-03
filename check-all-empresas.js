const { createClient } = require('@supabase/supabase-js');

const supabaseConfig = {
  url: 'https://nxamrvfusyrtkcshehfm.supabase.co',
  anonKey: 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31'
};

const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

async function checkAllEmpresas() {
  console.log('=== VERIFICAÇÃO: Todos os EmpresaIds e seus Grupos ===\n');

  try {
    // 1. Buscar todos os usuários e seus empresaIds
    console.log('1. Buscando todos os usuários...');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('auth_user_id, empresa_id, nome, email, nivel');

    if (usuariosError) {
      console.log('❌ Erro ao buscar usuários:', usuariosError);
      return;
    }

    console.log(`✅ Encontrados ${usuarios.length} usuários\n`);

    // 2. Buscar todos os grupos e agrupar por empresa_id
    console.log('2. Buscando todos os grupos...');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('id, nome, empresa_id');

    if (gruposError) {
      console.log('❌ Erro ao buscar grupos:', gruposError);
      return;
    }

    console.log(`✅ Encontrados ${grupos.length} grupos no total\n`);

    // 3. Agrupar grupos por empresa_id
    const gruposPorEmpresa = {};
    grupos.forEach(grupo => {
      if (!gruposPorEmpresa[grupo.empresa_id]) {
        gruposPorEmpresa[grupo.empresa_id] = [];
      }
      gruposPorEmpresa[grupo.empresa_id].push(grupo);
    });

    // 4. Mostrar estatísticas por empresa
    console.log('3. Estatísticas por empresa:\n');
    
    const empresaIds = Object.keys(gruposPorEmpresa);
    console.log(`📊 Total de empresas com grupos: ${empresaIds.length}\n`);

    empresaIds.forEach((empresaId, index) => {
      const gruposEmpresa = gruposPorEmpresa[empresaId];
      console.log(`${index + 1}. EmpresaId: ${empresaId}`);
      console.log(`   Grupos: ${gruposEmpresa.length}`);
      
      if (gruposEmpresa.length > 0) {
        console.log(`   Primeiros grupos:`);
        gruposEmpresa.slice(0, 3).forEach((grupo, i) => {
          console.log(`     ${i + 1}. ${grupo.nome}`);
        });
        if (gruposEmpresa.length > 3) {
          console.log(`     ... e mais ${gruposEmpresa.length - 3} grupos`);
        }
      }
      console.log('');
    });

    // 5. Verificar qual empresa tem 12 grupos
    console.log('4. Procurando empresa com 12 grupos...\n');
    const empresaCom12Grupos = empresaIds.find(id => gruposPorEmpresa[id].length === 12);
    
    if (empresaCom12Grupos) {
      console.log(`✅ Empresa com 12 grupos encontrada: ${empresaCom12Grupos}`);
      console.log('📋 Todos os grupos desta empresa:');
      gruposPorEmpresa[empresaCom12Grupos].forEach((grupo, index) => {
        console.log(`   ${index + 1}. ${grupo.nome} (ID: ${grupo.id})`);
      });
    } else {
      console.log('❌ Nenhuma empresa com exatamente 12 grupos encontrada');
    }

    // 6. Verificar se algum usuário está associado à empresa com 12 grupos
    if (empresaCom12Grupos) {
      console.log(`\n5. Verificando usuários da empresa com 12 grupos...\n`);
      const usuariosEmpresa = usuarios.filter(u => u.empresa_id === empresaCom12Grupos);
      
      if (usuariosEmpresa.length > 0) {
        console.log(`✅ Encontrados ${usuariosEmpresa.length} usuários nesta empresa:`);
        usuariosEmpresa.forEach((usuario, index) => {
          console.log(`   ${index + 1}. ${usuario.nome} (${usuario.email})`);
        });
      } else {
        console.log('❌ Nenhum usuário encontrado para esta empresa');
        console.log('⚠️  Isso pode explicar por que a aplicação não carrega os dados!');
      }
    }

    // 7. Verificar empresas na tabela empresas
    console.log(`\n6. Verificando tabela empresas...\n`);
    const { data: empresasData, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome');

    if (empresasError) {
      console.log('❌ Erro ao buscar empresas:', empresasError);
    } else {
      console.log(`✅ Encontradas ${empresasData.length} empresas na tabela empresas:`);
      empresasData.forEach((empresa, index) => {
        const gruposCount = gruposPorEmpresa[empresa.id] ? gruposPorEmpresa[empresa.id].length : 0;
        console.log(`   ${index + 1}. ${empresa.nome} (ID: ${empresa.id}) - ${gruposCount} grupos`);
      });
    }

  } catch (error) {
    console.log('❌ Erro geral:', error);
  }

  console.log('\n=== Verificação concluída ===');
}

checkAllEmpresas();