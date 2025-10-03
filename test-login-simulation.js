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

async function testLoginAndData() {
  console.log('🔍 TESTE: Simulando login e verificação de dados...\n');
  
  try {
    // 1. Verificar usuários disponíveis
    console.log('1. Verificando usuários disponíveis...');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('auth_user_id, nome, email, empresa_id')
      .limit(5);
    
    if (usuariosError) {
      console.error('❌ Erro ao buscar usuários:', usuariosError);
      return;
    }
    
    console.log('✅ Usuários encontrados:', usuarios.length);
    usuarios.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.nome} (${user.email}) - Empresa: ${user.empresa_id}`);
    });
    
    // 2. Tentar fazer login com um usuário conhecido
    const usuarioTeste = usuarios.find(u => u.email === 'techrodolfo@gmail.com') || usuarios[0];
    
    if (!usuarioTeste) {
      console.log('❌ Nenhum usuário encontrado para teste');
      return;
    }
    
    console.log(`\n2. Testando com usuário: ${usuarioTeste.nome} (${usuarioTeste.email})`);
    console.log(`   EmpresaId: ${usuarioTeste.empresa_id}`);
    
    // 3. Verificar grupos para este usuário
    console.log('\n3. Verificando grupos para este usuário...');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('id, nome')
      .eq('empresa_id', usuarioTeste.empresa_id)
      .order('nome');
    
    if (gruposError) {
      console.error('❌ Erro ao buscar grupos:', gruposError);
    } else {
      console.log(`✅ Grupos encontrados: ${grupos.length}`);
      grupos.forEach((grupo, index) => {
        console.log(`   ${index + 1}. ${grupo.nome}`);
      });
    }
    
    // 4. Verificar categorias
    console.log('\n4. Verificando categorias...');
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select('id, nome, grupo_id')
      .eq('empresa_id', usuarioTeste.empresa_id)
      .order('nome');
    
    if (categoriasError) {
      console.error('❌ Erro ao buscar categorias:', categoriasError);
    } else {
      console.log(`✅ Categorias encontradas: ${categorias.length}`);
      categorias.slice(0, 5).forEach((categoria, index) => {
        console.log(`   ${index + 1}. ${categoria.nome} (Grupo: ${categoria.grupo_id})`);
      });
    }
    
    // 5. Verificar subcategorias
    console.log('\n5. Verificando subcategorias...');
    const { data: subcategorias, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select('id, nome, categoria_id')
      .eq('empresa_id', usuarioTeste.empresa_id)
      .order('nome');
    
    if (subcategoriasError) {
      console.error('❌ Erro ao buscar subcategorias:', subcategoriasError);
    } else {
      console.log(`✅ Subcategorias encontradas: ${subcategorias.length}`);
      subcategorias.slice(0, 5).forEach((subcategoria, index) => {
        console.log(`   ${index + 1}. ${subcategoria.nome} (Categoria: ${subcategoria.categoria_id})`);
      });
    }
    
    // 6. Conclusão
    console.log('\n📊 RESUMO DO TESTE:');
    console.log(`   Usuário: ${usuarioTeste.nome}`);
    console.log(`   EmpresaId: ${usuarioTeste.empresa_id}`);
    console.log(`   Grupos: ${grupos?.length || 0}`);
    console.log(`   Categorias: ${categorias?.length || 0}`);
    console.log(`   Subcategorias: ${subcategorias?.length || 0}`);
    
    if (grupos && grupos.length > 0) {
      console.log('\n✅ CONCLUSÃO: A aplicação NÃO deveria mostrar "Nenhum grupo criado"');
      console.log('   O problema está na autenticação ou no carregamento do empresaId');
    } else {
      console.log('\n❌ CONCLUSÃO: Este usuário realmente não tem grupos');
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

testLoginAndData();