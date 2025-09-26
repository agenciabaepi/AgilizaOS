const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarAPIAlteracao() {
  console.log('🧪 TESTANDO API DE ALTERAÇÃO DE EQUIPAMENTO\n');

  try {
    // 1. Buscar uma OS com FONE DE OUVIDO para alterar de volta para CELULAR
    const { data: ordens } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .eq('equipamento', 'FONE DE OUVIDO')
      .limit(1);

    if (!ordens || ordens.length === 0) {
      console.error('❌ Nenhuma OS com FONE DE OUVIDO encontrada');
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

    // 3. Simular chamada da API
    console.log(`\n🔄 Simulando chamada da API para alterar FONE DE OUVIDO → CELULAR...`);
    
    // Simular a lógica da API
    const equipamentoAnterior = osTeste.equipamento; // FONE DE OUVIDO
    const equipamentoNovo = 'CELULAR';
    const empresaId = osTeste.empresa_id;

    console.log(`🔍 Equipamento anterior: ${equipamentoAnterior}`);
    console.log(`🔍 Equipamento novo: ${equipamentoNovo}`);

    if (equipamentoAnterior !== equipamentoNovo) {
      console.log('🔄 Equipamento alterado! Recalculando contadores...');

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

    // 4. Alterar o equipamento da OS
    console.log(`\n🔄 Alterando equipamento da OS...`);
    const { error: updateOSError } = await supabase
      .from('ordens_servico')
      .update({ equipamento: equipamentoNovo })
      .eq('id', osTeste.id);

    if (updateOSError) {
      console.error('❌ Erro ao alterar equipamento da OS:', updateOSError);
      return;
    }

    console.log('✅ Equipamento da OS alterado com sucesso!\n');

    // 5. Verificar contadores depois
    console.log('📊 CONTADORES DEPOIS:');
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

testarAPIAlteracao();
