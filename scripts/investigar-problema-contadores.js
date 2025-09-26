const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigarProblema() {
  console.log('🔍 INVESTIGANDO PROBLEMA DOS CONTADORES\n');

  try {
    // 1. Verificar todos os equipamentos_tipos
    console.log('1️⃣ EQUIPAMENTOS CADASTRADOS:');
    const { data: equipamentos } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    equipamentos?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

    // 2. Verificar todas as OS com equipamento
    console.log('\n2️⃣ ORDENS DE SERVIÇO COM EQUIPAMENTO:');
    const { data: ordens } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .not('equipamento', 'is', null)
      .order('numero_os');

    console.log(`📋 Total de OS com equipamento: ${ordens?.length || 0}`);
    ordens?.forEach(os => {
      console.log(`   - OS ${os.numero_os}: ${os.equipamento} (empresa: ${os.empresa_id})`);
    });

    // 3. Contar quantidade real por equipamento
    console.log('\n3️⃣ CONTAGEM REAL POR EQUIPAMENTO:');
    const contagemReal = {};
    
    ordens?.forEach(os => {
      if (os.equipamento && os.empresa_id) {
        const key = `${os.empresa_id}-${os.equipamento}`;
        contagemReal[key] = (contagemReal[key] || 0) + 1;
      }
    });

    Object.entries(contagemReal).forEach(([key, count]) => {
      const [empresaId, equipamento] = key.split('-');
      console.log(`   - ${equipamento} (${empresaId}): ${count} usos`);
    });

    // 4. Comparar com contadores atuais
    console.log('\n4️⃣ COMPARAÇÃO DETALHADA:');
    for (const eq of equipamentos || []) {
      const key = `${eq.empresa_id}-${eq.nome}`;
      const contagemRealEquipamento = contagemReal[key] || 0;
      
      console.log(`\n📊 ${eq.nome} (${eq.empresa_id}):`);
      console.log(`   Contador atual: ${eq.quantidade_cadastrada}`);
      console.log(`   Contagem real: ${contagemRealEquipamento}`);
      
      if (eq.quantidade_cadastrada !== contagemRealEquipamento) {
        console.log(`   ❌ DISCREPÂNCIA: ${contagemRealEquipamento - eq.quantidade_cadastrada}`);
        
        // Atualizar o contador
        console.log(`   🔄 Atualizando contador...`);
        const { error: updateError } = await supabase
          .from('equipamentos_tipos')
          .update({ quantidade_cadastrada: contagemRealEquipamento })
          .eq('id', eq.id);

        if (updateError) {
          console.log(`   ❌ Erro ao atualizar: ${updateError.message}`);
        } else {
          console.log(`   ✅ Contador atualizado para ${contagemRealEquipamento}`);
        }
      } else {
        console.log(`   ✅ Contador correto`);
      }
    }

    // 5. Verificar resultado final
    console.log('\n5️⃣ RESULTADO FINAL:');
    const { data: equipamentosFinais } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    equipamentosFinais?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

  } catch (error) {
    console.error('❌ Erro na investigação:', error);
  }
}

investigarProblema();
