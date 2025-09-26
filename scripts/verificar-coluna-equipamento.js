const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 VERIFICANDO COLUNA EQUIPAMENTO NA TABELA ORDENS_SERVICO\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarColunaEquipamento() {
  try {
    console.log('🔍 Verificando se a coluna equipamento existe...');
    
    // Tentar fazer uma consulta simples para verificar se a coluna existe
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('equipamento')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('equipamento')) {
        console.log('❌ Coluna equipamento NÃO existe na tabela ordens_servico');
        console.log('🔧 Criando a coluna agora...');
        
        // Tentar criar a coluna usando uma consulta SQL direta
        const { error: alterError } = await supabase
          .rpc('exec', { 
            sql: 'ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS equipamento VARCHAR(255);' 
          });
        
        if (alterError) {
          console.log('⚠️ Não foi possível criar a coluna automaticamente');
          console.log('📝 Execute manualmente no Supabase SQL Editor:');
          console.log('');
          console.log('ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS equipamento VARCHAR(255);');
          console.log('');
          return;
        }
        
        console.log('✅ Coluna equipamento criada com sucesso!');
      } else {
        console.error('❌ Erro inesperado:', error);
        return;
      }
    } else {
      console.log('✅ Coluna equipamento JÁ existe na tabela ordens_servico');
      console.log('📊 Dados encontrados:', data);
    }
    
    // Verificar novamente após criação
    console.log('\n🔍 Verificando novamente...');
    const { data: dataFinal, error: errorFinal } = await supabase
      .from('ordens_servico')
      .select('equipamento')
      .limit(1);
    
    if (!errorFinal) {
      console.log('✅ Coluna equipamento confirmada e funcionando!');
      console.log('📊 Exemplo de dados:', dataFinal);
    } else {
      console.log('❌ Ainda há problemas:', errorFinal);
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

verificarColunaEquipamento();
