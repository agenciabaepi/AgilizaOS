const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugContadorEquipamentos() {
  console.log('🔍 DEBUG: Verificando contador de equipamentos\n');

  try {
    // 1. Verificar equipamentos_tipos
    console.log('1️⃣ Verificando tabela equipamentos_tipos:');
    const { data: equipamentos, error: equipamentosError } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    if (equipamentosError) {
      console.error('❌ Erro ao buscar equipamentos:', equipamentosError);
      return;
    }

    console.log('📊 Equipamentos encontrados:');
    equipamentos?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

    // 2. Verificar ordens_servico com equipamento
    console.log('\n2️⃣ Verificando ordens_servico com equipamento:');
    const { data: ordens, error: ordensError } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .not('equipamento', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordensError) {
      console.error('❌ Erro ao buscar ordens:', ordensError);
      return;
    }

    console.log('📋 Últimas 10 OS com equipamento:');
    ordens?.forEach(os => {
      console.log(`   - OS ${os.numero_os}: ${os.equipamento} (empresa: ${os.empresa_id})`);
    });

    // 3. Testar atualização manual
    console.log('\n3️⃣ Testando atualização manual do contador:');
    if (equipamentos && equipamentos.length > 0) {
      const equipamentoTeste = equipamentos[0];
      console.log(`🔧 Testando com: ${equipamentoTeste.nome}`);
      
      const { error: updateError } = await supabase
        .from('equipamentos_tipos')
        .update({ 
          quantidade_cadastrada: equipamentoTeste.quantidade_cadastrada + 1 
        })
        .eq('id', equipamentoTeste.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar contador:', updateError);
      } else {
        console.log('✅ Contador atualizado com sucesso!');
        
        // Verificar se foi atualizado
        const { data: equipamentoAtualizado } = await supabase
          .from('equipamentos_tipos')
          .select('quantidade_cadastrada')
          .eq('id', equipamentoTeste.id)
          .single();
        
        console.log(`📊 Novo valor: ${equipamentoAtualizado?.quantidade_cadastrada}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugContadorEquipamentos();
