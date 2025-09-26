require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testTable() {
  console.log('🔍 Testando se a tabela equipamentos_tipos existe...');
  
  try {
    // Tentar fazer uma consulta simples na tabela
    const { data, error } = await supabase
      .from('equipamentos_tipos')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Tabela não existe ou erro:', error.message);
      console.log('\n📋 Execute o SQL abaixo no Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      
      const fs = require('fs');
      const sqlContent = fs.readFileSync('migrate-equipamentos-tipos.sql', 'utf8');
      console.log(sqlContent);
      console.log('='.repeat(80) + '\n');
      
      return;
    }
    
    console.log('✅ Tabela equipamentos_tipos existe!');
    console.log('📊 Dados encontrados:', data);
    
  } catch (error) {
    console.error('❌ Erro ao testar tabela:', error.message);
  }
}

testTable();
