require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simularCarregamentoPagina() {
  console.log('🔍 Simulando carregamento da página de categorias...\n');

  const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
  console.log('🏢 Empresa ID:', empresaId);

  try {
    console.log('\n1️⃣ Carregando grupos (simulando função carregarDados)...');
    
    // Simular exatamente a query da função carregarDados
    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    console.log('📊 Resultado da query grupos:');
    console.log('   - Error:', gruposError);
    console.log('   - Data length:', gruposData ? gruposData.length : 0);
    console.log('   - Data:', gruposData);

    console.log('\n2️⃣ Carregando categorias...');
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    console.log('📊 Resultado da query categorias:');
    console.log('   - Error:', categoriasError);
    console.log('   - Data length:', categoriasData ? categoriasData.length : 0);

    console.log('\n3️⃣ Carregando subcategorias...');
    const { data: subcategoriasData, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    console.log('📊 Resultado da query subcategorias:');
    console.log('   - Error:', subcategoriasError);
    console.log('   - Data length:', subcategoriasData ? subcategoriasData.length : 0);

    // Simular a lógica de estado da página
    console.log('\n4️⃣ Simulando estado da página...');
    
    const grupos = gruposData || [];
    const categorias = categoriasData || [];
    const subcategorias = subcategoriasData || [];
    
    console.log('📋 Estado simulado:');
    console.log('   - grupos.length:', grupos.length);
    console.log('   - categorias.length:', categorias.length);
    console.log('   - subcategorias.length:', subcategorias.length);
    
    // Verificar condições que podem causar "Nenhum grupo criado"
    console.log('\n5️⃣ Verificando condições de exibição...');
    
    if (grupos.length === 0) {
      console.log('❌ PROBLEMA: grupos.length === 0 - isso causaria "Nenhum grupo criado"');
    } else {
      console.log('✅ grupos.length > 0 - deveria mostrar os grupos');
    }
    
    // Verificar se há algum erro que impediria o carregamento
    if (gruposError || categoriasError || subcategoriasError) {
      console.log('❌ PROBLEMA: Há erros nas queries que podem impedir o carregamento');
    } else {
      console.log('✅ Nenhum erro nas queries');
    }

    // Verificar autenticação
    console.log('\n6️⃣ Verificando autenticação...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ PROBLEMA: Erro de autenticação:', authError.message);
    } else if (!user) {
      console.log('❌ PROBLEMA: Usuário não autenticado');
    } else {
      console.log('✅ Usuário autenticado:', user.id);
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

simularCarregamentoPagina();