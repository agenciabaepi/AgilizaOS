require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarTabelas() {
  console.log('🔍 Verificando tabelas de categorias...\n');

  try {
    // Verificar tabela grupos_produtos
    console.log('1️⃣ Verificando grupos_produtos...');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .limit(5);

    if (gruposError) {
      console.log('❌ Erro ao acessar grupos_produtos:', gruposError.message);
    } else {
      console.log('✅ grupos_produtos existe!');
      console.log(`📊 Total de registros encontrados: ${grupos.length}`);
      if (grupos.length > 0) {
        console.log('📋 Exemplo de dados:', grupos[0]);
      }
    }

    // Verificar tabela categorias_produtos
    console.log('\n2️⃣ Verificando categorias_produtos...');
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select('*')
      .limit(5);

    if (categoriasError) {
      console.log('❌ Erro ao acessar categorias_produtos:', categoriasError.message);
    } else {
      console.log('✅ categorias_produtos existe!');
      console.log(`📊 Total de registros encontrados: ${categorias.length}`);
      if (categorias.length > 0) {
        console.log('📋 Exemplo de dados:', categorias[0]);
      }
    }

    // Verificar tabela subcategorias_produtos
    console.log('\n3️⃣ Verificando subcategorias_produtos...');
    const { data: subcategorias, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select('*')
      .limit(5);

    if (subcategoriasError) {
      console.log('❌ Erro ao acessar subcategorias_produtos:', subcategoriasError.message);
    } else {
      console.log('✅ subcategorias_produtos existe!');
      console.log(`📊 Total de registros encontrados: ${subcategorias.length}`);
      if (subcategorias.length > 0) {
        console.log('📋 Exemplo de dados:', subcategorias[0]);
      }
    }

    // Verificar dados específicos para a empresa
    console.log('\n4️⃣ Verificando dados para empresa específica...');
    const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
    
    const { data: gruposEmpresa, error: gruposEmpresaError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId);

    if (gruposEmpresaError) {
      console.log('❌ Erro ao buscar grupos da empresa:', gruposEmpresaError.message);
    } else {
      console.log(`📊 Grupos para empresa ${empresaId}: ${gruposEmpresa.length}`);
      if (gruposEmpresa.length > 0) {
        console.log('📋 Grupos encontrados:', gruposEmpresa);
      } else {
        console.log('⚠️ Nenhum grupo encontrado para esta empresa');
      }
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

verificarTabelas();