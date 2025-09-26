const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarCriacaoOS() {
  console.log('🧪 TESTANDO CRIAÇÃO DE OS COM IMPRESSORA\n');

  try {
    // 1. Verificar estado atual dos contadores
    console.log('1️⃣ Estado atual dos contadores:');
    const { data: equipamentosAntes } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .eq('nome', 'IMPRESSORA')
      .order('empresa_id');

    equipamentosAntes?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

    // 2. Simular dados de uma OS
    const dadosOS = {
      cliente_id: 'teste-cliente-id',
      tecnico_id: null,
      status: 'EM_ANALISE',
      equipamento: 'IMPRESSORA',
      empresa_id: '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed',
      numero_os: 'TESTE-001',
      marca: 'TESTE',
      modelo: 'TESTE',
      problema_relatado: 'Teste de contador'
    };

    console.log('\n2️⃣ Dados da OS simulada:', dadosOS);

    // 3. Testar a lógica de atualização do contador
    console.log('\n3️⃣ Testando lógica de atualização:');
    
    if (dadosOS.equipamento) {
      console.log('🔍 Buscando equipamento:', dadosOS.equipamento);
      
      const { data: equipamentoData, error: equipamentoError } = await supabase
        .from('equipamentos_tipos')
        .select('id, quantidade_cadastrada')
        .eq('nome', dadosOS.equipamento)
        .eq('empresa_id', dadosOS.empresa_id)
        .single();

      console.log('🔍 Resultado da busca:', { equipamentoData, equipamentoError });

      if (!equipamentoError && equipamentoData) {
        console.log('✅ Equipamento encontrado:', equipamentoData);
        
        const novoValor = equipamentoData.quantidade_cadastrada + 1;
        console.log(`🔄 Incrementando contador de ${equipamentoData.quantidade_cadastrada} para ${novoValor}`);
        
        const { error: updateError } = await supabase
          .from('equipamentos_tipos')
          .update({ 
            quantidade_cadastrada: novoValor 
          })
          .eq('id', equipamentoData.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar contador:', updateError);
        } else {
          console.log('✅ Contador atualizado para:', novoValor);
        }
      } else {
        console.log('⚠️ Equipamento não encontrado:', equipamentoError);
      }
    }

    // 4. Verificar estado final
    console.log('\n4️⃣ Estado final dos contadores:');
    const { data: equipamentosDepois } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .eq('nome', 'IMPRESSORA')
      .order('empresa_id');

    equipamentosDepois?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarCriacaoOS();
