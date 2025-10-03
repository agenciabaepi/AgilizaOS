const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmpresaEspecifica() {
  try {
    // Empresa que apareceu nos logs
    const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
    
    console.log(`🔍 Testando empresa específica: ${empresaId}`);
    
    // Testar a mesma query que a aplicação faz
    console.log('\n📊 Testando query de grupos...');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (gruposError) {
      console.error('❌ Erro ao carregar grupos:', gruposError);
    } else {
      console.log('✅ Grupos carregados com sucesso');
      console.log('📊 Total de grupos:', grupos?.length || 0);
      if (grupos && grupos.length > 0) {
        grupos.forEach((grupo, index) => {
          console.log(`  Grupo ${index + 1}: ${grupo.nome} (ID: ${grupo.id})`);
        });
      }
    }

    // Testar query de categorias
    console.log('\n📊 Testando query de categorias...');
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select(`
        *,
        grupo:grupos_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    if (categoriasError) {
      console.error('❌ Erro ao carregar categorias:', categoriasError);
    } else {
      console.log('✅ Categorias carregadas com sucesso');
      console.log('📊 Total de categorias:', categorias?.length || 0);
      if (categorias && categorias.length > 0) {
        categorias.forEach((categoria, index) => {
          console.log(`  Categoria ${index + 1}: ${categoria.nome} (Grupo: ${categoria.grupo?.nome || 'N/A'})`);
        });
      }
    }

    // Testar query de subcategorias
    console.log('\n📊 Testando query de subcategorias...');
    const { data: subcategorias, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select(`
        *,
        categoria:categorias_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    if (subcategoriasError) {
      console.error('❌ Erro ao carregar subcategorias:', subcategoriasError);
    } else {
      console.log('✅ Subcategorias carregadas com sucesso');
      console.log('📊 Total de subcategorias:', subcategorias?.length || 0);
      if (subcategorias && subcategorias.length > 0) {
        subcategorias.forEach((subcategoria, index) => {
          console.log(`  Subcategoria ${index + 1}: ${subcategoria.nome} (Categoria: ${subcategoria.categoria?.nome || 'N/A'})`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

testEmpresaEspecifica();