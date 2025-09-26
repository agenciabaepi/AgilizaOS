const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 Verificando se a coluna checklist_entrada existe...');
    
    // Tentar fazer uma query simples para verificar se a coluna existe
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('checklist_entrada')
      .limit(1);

    if (error) {
      if (error.code === '42703') {
        console.log('❌ Coluna checklist_entrada não existe ainda.');
        console.log('');
        console.log('📋 Para criar a coluna, execute no Supabase SQL Editor:');
        console.log('');
        console.log('ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS checklist_entrada TEXT;');
        console.log('');
        console.log('COMMENT ON COLUMN ordens_servico.checklist_entrada IS \'Checklist de entrada do aparelho armazenado como JSON\';');
        console.log('');
        console.log('🔄 Após executar, rode este script novamente para verificar.');
      } else {
        console.error('❌ Erro inesperado:', error);
      }
      return;
    }

    console.log('✅ Coluna checklist_entrada existe e está funcionando!');
    console.log('📋 A migração foi concluída com sucesso.');
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

checkMigration();