const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase com as credenciais corretas
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCategorias() {
  console.log('=== DEBUG FINAL: Página de Categorias ===\n');
  
  const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
  console.log(`EmpresaId sendo usado: ${empresaId}\n`);

  try {
    // 1. Testar query exata da página
    console.log('1. Testando query exata de grupos_produtos...');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (gruposError) {
      console.log('❌ Erro ao buscar grupos:', gruposError);
    } else {
      console.log(`✅ Grupos encontrados: ${grupos.length}`);
      if (grupos.length > 0) {
        console.log('📋 Primeiros grupos:');
        grupos.slice(0, 3).forEach((grupo, index) => {
          console.log(`   ${index + 1}. ${grupo.nome} (ID: ${grupo.id})`);
        });
      }
    }

    // 2. Verificar se existem dados na tabela
    console.log('\n2. Verificando total de grupos na tabela...');
    const { data: todosGrupos, error: todosError } = await supabase
      .from('grupos_produtos')
      .select('*');

    if (todosError) {
      console.log('❌ Erro ao buscar todos os grupos:', todosError);
    } else {
      console.log(`✅ Total de grupos na tabela: ${todosGrupos.length}`);
      
      // Verificar empresas diferentes
      const empresasUnicas = [...new Set(todosGrupos.map(g => g.empresa_id))];
      console.log(`📊 Empresas com grupos: ${empresasUnicas.length}`);
      empresasUnicas.forEach(empId => {
        const count = todosGrupos.filter(g => g.empresa_id === empId).length;
        console.log(`   - ${empId}: ${count} grupos`);
      });
    }

    // 3. Testar categorias
    console.log('\n3. Testando query de categorias_produtos...');
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (categoriasError) {
      console.log('❌ Erro ao buscar categorias:', categoriasError);
    } else {
      console.log(`✅ Categorias encontradas: ${categorias.length}`);
    }

    // 4. Testar subcategorias
    console.log('\n4. Testando query de subcategorias_produtos...');
    const { data: subcategorias, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (subcategoriasError) {
      console.log('❌ Erro ao buscar subcategorias:', subcategoriasError);
    } else {
      console.log(`✅ Subcategorias encontradas: ${subcategorias.length}`);
    }

    // 5. Simular comportamento da página
    console.log('\n5. Simulando comportamento da página...');
    const loading = false;
    const gruposLength = grupos ? grupos.length : 0;
    const mostrarMensagem = gruposLength === 0 && !loading;
    
    console.log('Estado da página:');
    console.log(`   - loading: ${loading}`);
    console.log(`   - grupos.length: ${gruposLength}`);
    console.log(`   - Condição para mostrar "Nenhum grupo criado": ${mostrarMensagem}`);
    
    if (mostrarMensagem) {
      console.log('🔍 RESULTADO: A página mostrará "Nenhum grupo criado"');
    } else {
      console.log('🔍 RESULTADO: A página mostrará os grupos encontrados');
    }

  } catch (error) {
    console.log('❌ Erro geral:', error);
  }

  console.log('\n=== Debug concluído ===');
}

debugCategorias();