const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGruposEmpresa() {
  console.log('🔍 Verificando tabelas no banco de dados...');
  
  // Tentar buscar algumas tabelas conhecidas
  const tabelasParaTestar = ['grupos', 'categorias', 'subcategorias', 'empresas', 'usuarios', 'produtos'];
  
  for (const tabela of tabelasParaTestar) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabela '${tabela}' não existe ou erro:`, error.message);
      } else {
        console.log(`✅ Tabela '${tabela}' existe (${data?.length || 0} registros encontrados)`);
      }
    } catch (e) {
      console.log(`❌ Erro ao testar tabela '${tabela}':`, e.message);
    }
  }
  
  // Se a tabela grupos não existir, vamos verificar se existe alguma tabela similar
  console.log('\n🔍 Verificando tabelas similares...');
  const tabelasSimilares = ['grupo', 'product_groups', 'category_groups', 'item_groups'];
  
  for (const tabela of tabelasSimilares) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabela '${tabela}' não existe`);
      } else {
        console.log(`✅ Tabela '${tabela}' existe!`);
        if (data && data.length > 0) {
          console.log(`   Exemplo de registro:`, data[0]);
        }
      }
    } catch (e) {
      console.log(`❌ Erro ao testar tabela '${tabela}':`, e.message);
    }
  }
}

checkGruposEmpresa();