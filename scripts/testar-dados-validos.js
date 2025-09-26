const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function obterDadosValidos() {
  console.log('🔍 OBTENDO DADOS VÁLIDOS PARA TESTE\n');

  try {
    // 1. Buscar um cliente válido
    console.log('1️⃣ Buscando cliente válido...');
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, nome')
      .limit(1);

    if (!clientes || clientes.length === 0) {
      console.log('❌ Nenhum cliente encontrado');
      return;
    }

    const cliente = clientes[0];
    console.log('✅ Cliente encontrado:', cliente);

    // 2. Buscar empresa válida
    console.log('\n2️⃣ Buscando empresa válida...');
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, nome')
      .limit(1);

    if (!empresas || empresas.length === 0) {
      console.log('❌ Nenhuma empresa encontrada');
      return;
    }

    const empresa = empresas[0];
    console.log('✅ Empresa encontrada:', empresa);

    // 3. Verificar estado atual do contador
    console.log('\n3️⃣ Estado atual do contador IMPRESSORA:');
    const { data: equipamentosAntes } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .eq('nome', 'IMPRESSORA')
      .eq('empresa_id', empresa.id);

    equipamentosAntes?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

    // 4. Dados válidos para teste
    const dadosOS = {
      cliente_id: cliente.id,
      tecnico_id: null,
      status: 'EM_ANALISE',
      equipamento: 'IMPRESSORA',
      empresa_id: empresa.id,
      numero_os: `TESTE-${Date.now()}`,
      marca: 'TESTE',
      modelo: 'TESTE',
      problema_relatado: 'Teste de contador com dados válidos'
    };

    console.log('\n4️⃣ Dados válidos para teste:');
    console.log(JSON.stringify(dadosOS, null, 2));

    // 5. Testar atualização do contador
    console.log('\n5️⃣ Testando atualização do contador...');
    
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

    // 6. Verificar resultado final
    console.log('\n6️⃣ Estado final do contador:');
    const { data: equipamentosDepois } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .eq('nome', 'IMPRESSORA')
      .eq('empresa_id', empresa.id);

    equipamentosDepois?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

obterDadosValidos();
