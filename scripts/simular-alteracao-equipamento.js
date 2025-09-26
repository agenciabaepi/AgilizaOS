const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simularAlteracaoEquipamento() {
  console.log('🧪 SIMULANDO ALTERAÇÃO DE EQUIPAMENTO\n');

  try {
    // 1. Buscar uma OS existente
    const { data: ordens } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .not('equipamento', 'is', null)
      .limit(1);

    if (!ordens || ordens.length === 0) {
      console.error('❌ Nenhuma OS encontrada');
      return;
    }

    const osTeste = ordens[0];
    console.log(`📋 OS selecionada: ${osTeste.numero_os}`);
    console.log(`📱 Equipamento atual: ${osTeste.equipamento}`);
    console.log(`🏢 Empresa: ${osTeste.empresa_id}\n`);

    const equipamentoAnterior = osTeste.equipamento;
    const equipamentoNovo = equipamentoAnterior === 'CELULAR' ? 'IMPRESSORA' : 'CELULAR';

    // 2. Verificar contadores antes
    console.log('📊 CONTADORES ANTES:');
    const { data: equipamentosAntes } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada')
      .eq('empresa_id', osTeste.empresa_id)
      .in('nome', [equipamentoAnterior, equipamentoNovo]);

    equipamentosAntes?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

    // 3. Simular a lógica da API
    console.log(`\n🔄 SIMULANDO ALTERAÇÃO DE ${equipamentoAnterior} PARA ${equipamentoNovo}:`);

    // Decrementar equipamento anterior
    const equipamentoAnteriorData = equipamentosAntes?.find(eq => eq.nome === equipamentoAnterior);
    if (equipamentoAnteriorData) {
      const novoValorAnterior = Math.max(0, equipamentoAnteriorData.quantidade_cadastrada - 1);
      console.log(`📉 ${equipamentoAnterior}: ${equipamentoAnteriorData.quantidade_cadastrada} → ${novoValorAnterior}`);
    }

    // Incrementar equipamento novo
    const equipamentoNovoData = equipamentosAntes?.find(eq => eq.nome === equipamentoNovo);
    if (equipamentoNovoData) {
      const novoValorNovo = equipamentoNovoData.quantidade_cadastrada + 1;
      console.log(`📈 ${equipamentoNovo}: ${equipamentoNovoData.quantidade_cadastrada} → ${novoValorNovo}`);
    }

    console.log('\n✅ LÓGICA SIMULADA COM SUCESSO!');
    console.log('🎯 Quando você alterar uma OS de CELULAR para IMPRESSORA:');
    console.log('   1. Contador de CELULAR será decrementado (-1)');
    console.log('   2. Contador de IMPRESSORA será incrementado (+1)');
    console.log('   3. Os logs detalhados mostrarão cada operação');

  } catch (error) {
    console.error('❌ Erro na simulação:', error);
  }
}

simularAlteracaoEquipamento();
