require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
  console.log('🔄 Criando tabela equipamentos_tipos...');

  try {
    // Ler o arquivo SQL
    const fs = require('fs');
    const sqlContent = fs.readFileSync('migrate-equipamentos-tipos.sql', 'utf8');
    
    console.log('📋 Execute o SQL abaixo no Supabase SQL Editor:');
    console.log('\n' + '='.repeat(80));
    console.log(sqlContent);
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ Após executar o SQL, a tabela equipamentos_tipos será criada com dados iniciais.');
    
  } catch (error) {
    console.error('❌ Erro ao ler arquivo SQL:', error.message);
  }
}

runMigration();
