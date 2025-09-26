const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function corrigirContadoresAgora() {
  console.log('🔧 CORRIGINDO CONTADORES AGORA\n');

  try {
    // 1. Buscar todas as OS com equipamento
    const { data: todasOS } = await supabase
      .from('ordens_servico')
      .select('equipamento, empresa_id')
      .not('equipamento', 'is', null);

    // 2. Contar por equipamento e empresa
    const contagemReal = {};
    todasOS?.forEach(os => {
      const key = `${os.empresa_id}-${os.equipamento}`;
      contagemReal[key] = (contagemReal[key] || 0) + 1;
    });

    console.log('📊 Contagem real encontrada:', contagemReal);

    // 3. Buscar equipamentos_tipos
    const { data: equipamentos } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id');

    // 4. Atualizar cada equipamento
    for (const equipamento of equipamentos || []) {
      const key = `${equipamento.empresa_id}-${equipamento.nome}`;
      const quantidadeReal = contagemReal[key] || 0;
      
      console.log(`\n📊 ${equipamento.nome} (${equipamento.empresa_id}):`);
      console.log(`   Contador atual: ${equipamento.quantidade_cadastrada}`);
      console.log(`   Contagem real: ${quantidadeReal}`);
      
      if (equipamento.quantidade_cadastrada !== quantidadeReal) {
        console.log(`   🔄 Atualizando de ${equipamento.quantidade_cadastrada} para ${quantidadeReal}`);
        
        const { error: updateError } = await supabase
          .from('equipamentos_tipos')
          .update({ quantidade_cadastrada: quantidadeReal })
          .eq('id', equipamento.id);

        if (updateError) {
          console.log(`   ❌ Erro: ${updateError.message}`);
        } else {
          console.log(`   ✅ Atualizado com sucesso!`);
        }
      } else {
        console.log(`   ✅ Contador já está correto`);
      }
    }

    console.log('\n🎉 CORREÇÃO CONCLUÍDA!');

  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

corrigirContadoresAgora();
