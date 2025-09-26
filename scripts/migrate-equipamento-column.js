const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔧 MIGRAÇÃO: Adicionando coluna equipamento na tabela ordens_servico\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('   Certifique-se de que o arquivo .env.local existe e contém:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=...');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executarMigracao() {
  try {
    console.log('🔍 Executando migração...');
    
    // SQL para adicionar a coluna equipamento
    const sql = `
      ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS equipamento VARCHAR(255);
      COMMENT ON COLUMN ordens_servico.equipamento IS 'Tipo de equipamento para contador de uso (ex: CELULAR, NOTEBOOK)';
    `;
    
    console.log('📝 SQL a ser executado:');
    console.log(sql);
    
    // Executar a migração
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Erro ao executar migração:', error);
      console.log('\n🔧 SOLUÇÃO MANUAL:');
      console.log('1. Acesse o Supabase Dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute o seguinte SQL:');
      console.log('');
      console.log('ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS equipamento VARCHAR(255);');
      console.log('');
      console.log('4. Ou execute o arquivo migrate-equipamento-column.sql');
      return;
    }
    
    console.log('✅ Migração executada com sucesso!');
    console.log('📊 Resultado:', data);
    
    // Verificar se a coluna foi criada
    console.log('\n🔍 Verificando se a coluna foi criada...');
    const { data: colunas, error: verificarError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'ordens_servico')
      .eq('column_name', 'equipamento');
    
    if (verificarError) {
      console.log('⚠️ Não foi possível verificar a coluna automaticamente');
    } else if (colunas && colunas.length > 0) {
      console.log('✅ Coluna equipamento encontrada:', colunas[0]);
    } else {
      console.log('⚠️ Coluna equipamento não encontrada - execute manualmente');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    console.log('\n🔧 SOLUÇÃO MANUAL:');
    console.log('Execute o SQL manualmente no Supabase:');
    console.log('ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS equipamento VARCHAR(255);');
  }
}

executarMigracao();
