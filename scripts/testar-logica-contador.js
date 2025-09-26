const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarLogicaContador() {
  console.log('🧪 TESTANDO LÓGICA DE CONTADOR DIRETAMENTE\n');

  try {
    // 1. Buscar uma OS
    const { data: ordens } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .eq('equipamento', 'CELULAR')
      .limit(1);

    if (!ordens || ordens.length === 0) {
      console.error('❌ Nenhuma OS com CELULAR encontrada');
      return;
    }

    const osTeste = ordens[0];
    console.log(`📋 OS selecionada: ${osTeste.numero_os}`);
    console.log(`📱 Equipamento atual: ${osTeste.equipamento}`);
    console.log(`🏢 Empresa: ${osTeste.empresa_id}\n`);

    // 2. Simular a lógica da API
    const equipamentoAnterior = osTeste.equipamento; // CELULAR
    const equipamentoNovo = 'FONE DE OUVIDO';
    const empresaId = osTeste.empresa_id;

    console.log('🔍 Equipamento anterior:', equipamentoAnterior);
    console.log('🔍 Equipamento novo:', equipamentoNovo);
    console.log('🔍 Empresa ID:', empresaId);

    // 3. Verificar condição
    console.log(`\n🔍 Verificando condição:`);
    console.log(`   equipamentoAnterior !== equipamentoNovo: ${equipamentoAnterior !== equipamentoNovo}`);
    console.log(`   empresaId existe: ${!!empresaId}`);
    console.log(`   Condição completa: ${equipamentoAnterior !== equipamentoNovo && empresaId}`);

    if (equipamentoAnterior !== equipamentoNovo && empresaId) {
      console.log('✅ Condição atendida! Executando lógica de contador...\n');

      // Lista de equipamentos que precisam ter contadores atualizados
      const equipamentosParaAtualizar = [];
      if (equipamentoAnterior) equipamentosParaAtualizar.push(equipamentoAnterior);
      if (equipamentoNovo) equipamentosParaAtualizar.push(equipamentoNovo);

      console.log('📋 Equipamentos para atualizar:', equipamentosParaAtualizar);

      // Para cada equipamento, contar a quantidade real na tabela ordens_servico
      for (const nomeEquipamento of equipamentosParaAtualizar) {
        console.log(`\n🔍 Recalculando contador para ${nomeEquipamento}...`);
        
        // Contar quantidade real na tabela ordens_servico
        const { count: quantidadeReal, error: countError } = await supabase
          .from('ordens_servico')
          .select('*', { count: 'exact', head: true })
          .eq('equipamento', nomeEquipamento)
          .eq('empresa_id', empresaId);

        if (countError) {
          console.error(`❌ Erro ao contar ${nomeEquipamento}:`, countError);
          continue;
        }

        console.log(`   📊 Quantidade real: ${quantidadeReal}`);

        // Buscar o equipamento na tabela equipamentos_tipos
        const { data: equipamentoData, error: equipamentoError } = await supabase
          .from('equipamentos_tipos')
          .select('id, quantidade_cadastrada')
          .eq('nome', nomeEquipamento)
          .eq('empresa_id', empresaId)
          .single();

        if (equipamentoError) {
          console.error(`❌ Erro ao buscar equipamento ${nomeEquipamento}:`, equipamentoError);
          continue;
        }

        console.log(`   📋 Contador atual: ${equipamentoData.quantidade_cadastrada}`);

        // Atualizar com a quantidade real
        const { error: updateError } = await supabase
          .from('equipamentos_tipos')
          .update({ quantidade_cadastrada: quantidadeReal })
          .eq('id', equipamentoData.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${nomeEquipamento}:`, updateError);
        } else {
          console.log(`   ✅ ${nomeEquipamento} atualizado para ${quantidadeReal}`);
        }
      }
    } else {
      console.log('❌ Condição não atendida!');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarLogicaContador();
