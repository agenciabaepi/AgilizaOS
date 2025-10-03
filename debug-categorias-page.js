const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW1ydmZ1c3lydGtjc2hlaGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NTcyMDAsImV4cCI6MjA1MDAzMzIwMH0.yeCVZkUfO6Rut3Vr4EDzq5Ci9h7l1lUrukCwJMITS';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCategoriasPage() {
  console.log('=== DEBUG: Página de Categorias ===\n');
  
  const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
  console.log('EmpresaId sendo usado:', empresaId);
  
  try {
    // 1. Testar autenticação e obtenção do usuário
    console.log('\n1. Testando obtenção do usuário...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Erro de autenticação:', authError.message);
      console.log('⚠️  Continuando sem autenticação para testar queries diretas...\n');
    } else if (user) {
      console.log('✅ Usuário autenticado:', user.id);
      
      // Buscar dados do usuário
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id, nome')
        .eq('auth_user_id', user.id)
        .single();
      
      if (userError) {
        console.log('❌ Erro ao buscar dados do usuário:', userError.message);
      } else {
        console.log('✅ Dados do usuário:', userData);
        console.log('✅ EmpresaId do usuário:', userData?.empresa_id);
      }
    } else {
      console.log('⚠️  Nenhum usuário autenticado');
    }
    
    // 2. Testar query de grupos (exata da página)
    console.log('\n2. Testando query de grupos_produtos...');
    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    
    if (gruposError) {
      console.log('❌ Erro ao buscar grupos:', gruposError);
    } else {
      console.log('✅ Grupos encontrados:', gruposData?.length || 0);
      if (gruposData && gruposData.length > 0) {
        console.log('📋 Primeiros grupos:');
        gruposData.slice(0, 3).forEach((grupo, index) => {
          console.log(`   ${index + 1}. ${grupo.nome} (ID: ${grupo.id})`);
        });
      } else {
        console.log('⚠️  Nenhum grupo encontrado para esta empresa');
      }
    }
    
    // 3. Testar query de categorias (exata da página)
    console.log('\n3. Testando query de categorias_produtos...');
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select(`
        *,
        grupo:grupos_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');
    
    if (categoriasError) {
      console.log('❌ Erro ao buscar categorias:', categoriasError);
    } else {
      console.log('✅ Categorias encontradas:', categoriasData?.length || 0);
      if (categoriasData && categoriasData.length > 0) {
        console.log('📋 Primeiras categorias:');
        categoriasData.slice(0, 3).forEach((categoria, index) => {
          console.log(`   ${index + 1}. ${categoria.nome} (Grupo: ${categoria.grupo?.nome || 'N/A'})`);
        });
      }
    }
    
    // 4. Testar query de subcategorias (exata da página)
    console.log('\n4. Testando query de subcategorias_produtos...');
    const { data: subcategoriasData, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select(`
        *,
        categoria:categorias_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');
    
    if (subcategoriasError) {
      console.log('❌ Erro ao buscar subcategorias:', subcategoriasError);
    } else {
      console.log('✅ Subcategorias encontradas:', subcategoriasData?.length || 0);
      if (subcategoriasData && subcategoriasData.length > 0) {
        console.log('📋 Primeiras subcategorias:');
        subcategoriasData.slice(0, 3).forEach((subcategoria, index) => {
          console.log(`   ${index + 1}. ${subcategoria.nome} (Categoria: ${subcategoria.categoria?.nome || 'N/A'})`);
        });
      }
    }
    
    // 5. Verificar se existem dados com outros empresaIds
    console.log('\n5. Verificando se existem dados com outros empresaIds...');
    const { data: todosGrupos, error: todosGruposError } = await supabase
      .from('grupos_produtos')
      .select('empresa_id, nome')
      .limit(10);
    
    if (todosGruposError) {
      console.log('❌ Erro ao buscar todos os grupos:', todosGruposError);
    } else {
      console.log('📊 Amostra de grupos por empresa:');
      const empresasUnicas = [...new Set(todosGrupos?.map(g => g.empresa_id) || [])];
      empresasUnicas.forEach(empId => {
        const gruposEmpresa = todosGrupos?.filter(g => g.empresa_id === empId) || [];
        console.log(`   Empresa ${empId}: ${gruposEmpresa.length} grupos`);
        if (empId === empresaId) {
          console.log('   ⭐ Esta é a empresa que estamos testando');
        }
      });
    }
    
    // 6. Simular o comportamento da página
    console.log('\n6. Simulando comportamento da página...');
    const loading = false;
    const grupos = gruposData || [];
    
    console.log('Estado da página:');
    console.log(`   - loading: ${loading}`);
    console.log(`   - grupos.length: ${grupos.length}`);
    console.log(`   - Condição para mostrar "Nenhum grupo criado": ${grupos.length === 0 && !loading}`);
    
    if (grupos.length === 0 && !loading) {
      console.log('🔍 RESULTADO: A página mostrará "Nenhum grupo criado"');
    } else {
      console.log('🔍 RESULTADO: A página mostrará os grupos encontrados');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o debug
debugCategoriasPage().then(() => {
  console.log('\n=== Debug concluído ===');
  process.exit(0);
}).catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});