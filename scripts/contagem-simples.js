const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function contagemSimples() {
  console.log('🔍 CONTAGEM SIMPLES E DIRETA\n');

  try {
    // 1. Buscar TODAS as OS com equipamento
    console.log('📋 Buscando todas as OS com equipamento...');
    const { data: ordens, error: ordensError } = await supabase
      .from('ordens_servico')
      .select('equipamento, empresa_id')
      .not('equipamento', 'is', null);

    if (ordensError) {
      console.error('❌ Erro ao buscar OS:', ordensError);
      return;
    }

    console.log(`📊 Total de OS com equipamento: ${ordens.length}\n`);

    // 2. Contar por equipamento e empresa
    console.log('🔢 Contando por equipamento e empresa...');
    const contadores = {};
    
    ordens.forEach(os => {
      const key = `${os.empresa_id}-${os.equipamento}`;
      contadores[key] = (contadores[key] || 0) + 1;
    });

    // 3. Mostrar resultado
    console.log('📊 RESULTADO DA CONTAGEM:');
    Object.entries(contadores).forEach(([key, count]) => {
      const [empresaId, equipamento] = key.split('-');
      console.log(`   - ${equipamento} (${empresaId}): ${count} usos`);
    });

    // 4. Comparar com equipamentos_tipos
    console.log('\n🔍 COMPARANDO COM EQUIPAMENTOS_TIPOS:');
    const { data: equipamentos } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id');

    equipamentos?.forEach(eq => {
      const key = `${eq.empresa_id}-${eq.nome}`;
      const contagemReal = contadores[key] || 0;
      
      console.log(`\n📊 ${eq.nome} (${eq.empresa_id}):`);
      console.log(`   Contador atual: ${eq.quantidade_cadastrada}`);
      console.log(`   Contagem real: ${contagemReal}`);
      
      if (eq.quantidade_cadastrada !== contagemReal) {
        console.log(`   ❌ DISCREPÂNCIA: ${contagemReal - eq.quantidade_cadastrada}`);
        
        // Atualizar
        console.log(`   🔄 Atualizando...`);
        supabase
          .from('equipamentos_tipos')
          .update({ quantidade_cadastrada: contagemReal })
          .eq('id', eq.id)
          .then(({ error }) => {
            if (error) {
              console.log(`   ❌ Erro: ${error.message}`);
            } else {
              console.log(`   ✅ Atualizado para ${contagemReal}`);
            }
          });
      } else {
        console.log(`   ✅ Contador correto`);
      }
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

contagemSimples();
