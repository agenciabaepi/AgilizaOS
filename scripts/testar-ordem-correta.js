const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarOrdemCorreta() {
  console.log('🧪 TESTANDO ORDEM CORRETA DA API\n');

  try {
    // 1. Buscar uma OS com CELULAR para alterar para FONE DE OUVIDO
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

    // 2. Verificar contadores antes
    console.log('📊 CONTADORES ANTES:');
    const { data: equipamentosAntes } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada')
      .eq('empresa_id', osTeste.empresa_id)
      .in('nome', ['CELULAR', 'FONE DE OUVIDO']);

    equipamentosAntes?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

    // 3. Simular a ordem correta da API
    const equipamentoAnterior = osTeste.equipamento; // CELULAR
    const equipamentoNovo = 'FONE DE OUVIDO';
    const empresaId = osTeste.empresa_id;

    console.log(`\n🔄 Simulando ordem correta da API:`);
    console.log(`🔍 Equipamento anterior: ${equipamentoAnterior}`);
    console.log(`🔍 Equipamento novo: ${equipamentoNovo}`);

    // PASSO 1: Alterar o equipamento da OS PRIMEIRO
    console.log(`\n1️⃣ Alterando equipamento da OS de ${equipamentoAnterior} para ${equipamentoNovo}...`);
    const { error: updateOSError } = await supabase
      .from('ordens_servico')
      .update({ equipamento: equipamentoNovo })
      .eq('id', osTeste.id);

    if (updateOSError) {
      console.error('❌ Erro ao alterar equipamento da OS:', updateOSError);
      return;
    }

    console.log('✅ Equipamento da OS alterado com sucesso!\n');

    // PASSO 2: Recalcular contadores DEPOIS da alteração
    if (equipamentoAnterior !== equipamentoNovo) {
      console.log('2️⃣ Recalculando contadores após alteração...');

      // Lista de equipamentos que precisam ter contadores atualizados
      const equipamentosParaAtualizar = [];
      if (equipamentoAnterior) equipamentosParaAtualizar.push(equipamentoAnterior);
      if (equipamentoNovo) equipamentosParaAtualizar.push(equipamentoNovo);

      // Para cada equipamento, contar a quantidade real na tabela ordens_servico
      for (const nomeEquipamento of equipamentosParaAtualizar) {
        console.log(`🔍 Recalculando contador para ${nomeEquipamento}...`);
        
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

        const quantidadeFinal = quantidadeReal || 0;
        console.log(`📊 ${nomeEquipamento}: quantidade real = ${quantidadeFinal}`);

        // Buscar o equipamento na tabela equipamentos_tipos
        const { data: equipamentoData } = await supabase
          .from('equipamentos_tipos')
          .select('id, quantidade_cadastrada')
          .eq('nome', nomeEquipamento)
          .eq('empresa_id', empresaId)
          .single();

        if (equipamentoData) {
          console.log(`📈 Atualizando ${nomeEquipamento} de ${equipamentoData.quantidade_cadastrada} para ${quantidadeFinal}`);
          
          const { error: updateError } = await supabase
            .from('equipamentos_tipos')
            .update({ quantidade_cadastrada: quantidadeFinal })
            .eq('id', equipamentoData.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar contador:`, updateError);
          } else {
            console.log(`✅ ${nomeEquipamento} atualizado com sucesso!`);
          }
        } else {
          console.log(`⚠️ Equipamento ${nomeEquipamento} não encontrado na tabela equipamentos_tipos`);
        }
      }
    }

    // 4. Verificar contadores depois
    console.log('\n📊 CONTADORES DEPOIS:');
    const { data: equipamentosDepois } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada')
      .eq('empresa_id', osTeste.empresa_id)
      .in('nome', ['CELULAR', 'FONE DE OUVIDO']);

    equipamentosDepois?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarOrdemCorreta();
