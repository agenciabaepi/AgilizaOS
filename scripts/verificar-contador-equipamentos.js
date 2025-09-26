const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarContadorEquipamentos() {
  console.log('🔍 VERIFICANDO CONTADOR DE EQUIPAMENTOS\n');

  try {
    // 1. Verificar equipamentos_tipos
    console.log('1️⃣ Equipamentos cadastrados:');
    const { data: equipamentos, error: equipamentosError } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    if (equipamentosError) {
      console.error('❌ Erro ao buscar equipamentos:', equipamentosError);
      return;
    }

    equipamentos?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

    // 2. Verificar ordens_servico com equipamento
    console.log('\n2️⃣ OS com equipamento cadastrado:');
    const { data: ordens, error: ordensError } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .not('equipamento', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (ordensError) {
      console.error('❌ Erro ao buscar ordens:', ordensError);
      return;
    }

    console.log(`📋 Total de OS com equipamento: ${ordens?.length || 0}`);
    ordens?.forEach(os => {
      console.log(`   - OS ${os.numero_os}: ${os.equipamento} (empresa: ${os.empresa_id})`);
    });

    // 3. Contar por equipamento
    console.log('\n3️⃣ Contagem real por equipamento:');
    const contagemReal = {};
    
    ordens?.forEach(os => {
      if (os.equipamento && os.empresa_id) {
        if (!contagemReal[os.empresa_id]) {
          contagemReal[os.empresa_id] = {};
        }
        contagemReal[os.empresa_id][os.equipamento] = (contagemReal[os.empresa_id][os.equipamento] || 0) + 1;
      }
    });

    Object.entries(contagemReal).forEach(([empresaId, equipamentos]) => {
      console.log(`   Empresa ${empresaId}:`);
      Object.entries(equipamentos).forEach(([equipamento, count]) => {
        console.log(`     - ${equipamento}: ${count} usos`);
      });
    });

    // 4. Comparar com contadores atuais
    console.log('\n4️⃣ Comparação com contadores atuais:');
    equipamentos?.forEach(eq => {
      const contagemRealEmpresa = contagemReal[eq.empresa_id] || {};
      const contagemRealEquipamento = contagemRealEmpresa[eq.nome] || 0;
      
      if (eq.quantidade_cadastrada !== contagemRealEquipamento) {
        console.log(`❌ ${eq.nome} (${eq.empresa_id}):`);
        console.log(`   Contador atual: ${eq.quantidade_cadastrada}`);
        console.log(`   Contagem real: ${contagemRealEquipamento}`);
        console.log(`   Diferença: ${contagemRealEquipamento - eq.quantidade_cadastrada}`);
      } else {
        console.log(`✅ ${eq.nome} (${eq.empresa_id}): ${eq.quantidade_cadastrada} usos`);
      }
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarContadorEquipamentos();
