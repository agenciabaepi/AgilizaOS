const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseData() {
  try {
    console.log('=== VERIFICANDO DADOS NO BANCO ===');
    
    const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
    console.log('Empresa ID:', empresaId);
    
    // Verificar grupos
    console.log('\n--- GRUPOS ---');
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId);
    
    if (gruposError) {
      console.error('Erro ao buscar grupos:', gruposError);
    } else {
      console.log('Grupos encontrados:', grupos?.length || 0);
      if (grupos && grupos.length > 0) {
        console.log('Primeiros grupos:', grupos.slice(0, 3));
      }
    }
    
    // Verificar categorias
    console.log('\n--- CATEGORIAS ---');
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select('*')
      .eq('empresa_id', empresaId);
    
    if (categoriasError) {
      console.error('Erro ao buscar categorias:', categoriasError);
    } else {
      console.log('Categorias encontradas:', categorias?.length || 0);
      if (categorias && categorias.length > 0) {
        console.log('Primeiras categorias:', categorias.slice(0, 3));
      }
    }
    
    // Verificar subcategorias
    console.log('\n--- SUBCATEGORIAS ---');
    const { data: subcategorias, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select('*')
      .eq('empresa_id', empresaId);
    
    if (subcategoriasError) {
      console.error('Erro ao buscar subcategorias:', subcategoriasError);
    } else {
      console.log('Subcategorias encontradas:', subcategorias?.length || 0);
      if (subcategorias && subcategorias.length > 0) {
        console.log('Primeiras subcategorias:', subcategorias.slice(0, 3));
      }
    }
    
    // Verificar se a empresa existe
    console.log('\n--- VERIFICANDO EMPRESA ---');
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId);
    
    if (empresaError) {
      console.error('Erro ao buscar empresa:', empresaError);
    } else {
      console.log('Empresa encontrada:', empresa?.length > 0 ? 'SIM' : 'NÃO');
      if (empresa && empresa.length > 0) {
        console.log('Dados da empresa:', empresa[0]);
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

checkDatabaseData();