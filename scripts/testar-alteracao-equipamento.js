const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarAlteracaoEquipamento() {
  console.log('🧪 TESTANDO ALTERAÇÃO DE EQUIPAMENTO EM OS\n');

  try {
    // 1. Buscar uma OS existente para testar
    const { data: ordens, error: ordensError } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .not('equipamento', 'is', null)
      .limit(1);

    if (ordensError || !ordens || ordens.length === 0) {
      console.error('❌ Nenhuma OS encontrada para teste');
      return;
    }

    const osTeste = ordens[0];
    console.log(`📋 OS selecionada para teste: ${osTeste.numero_os}`);
    console.log(`📱 Equipamento atual: ${osTeste.equipamento}`);
    console.log(`🏢 Empresa: ${osTeste.empresa_id}\n`);

    // 2. Verificar contadores antes da alteração
    console.log('📊 CONTADORES ANTES DA ALTERAÇÃO:');
    const { data: equipamentosAntes } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada')
      .eq('empresa_id', osTeste.empresa_id)
      .in('nome', ['CELULAR', 'IMPRESSORA', 'NOTEBOOK', 'FONE DE OUVIDO']);

    equipamentosAntes?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

    // 3. Simular alteração de equipamento
    const equipamentoAnterior = osTeste.equipamento;
    const equipamentoNovo = equipamentoAnterior === 'CELULAR' ? 'IMPRESSORA' : 'CELULAR';
    
    console.log(`\n🔄 SIMULANDO ALTERAÇÃO:`);
    console.log(`   De: ${equipamentoAnterior}`);
    console.log(`   Para: ${equipamentoNovo}`);

    // 4. Fazer a alteração via API
    const response = await fetch(`http://localhost:3001/api/ordens/${osTeste.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        equipamento: equipamentoNovo,
        empresa_id: osTeste.empresa_id
      })
    });

    if (!response.ok) {
      console.error('❌ Erro na API:', response.status, response.statusText);
      return;
    }

    console.log('✅ Alteração realizada com sucesso!\n');

    // 5. Verificar contadores após a alteração
    console.log('📊 CONTADORES APÓS A ALTERAÇÃO:');
    const { data: equipamentosDepois } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada')
      .eq('empresa_id', osTeste.empresa_id)
      .in('nome', ['CELULAR', 'IMPRESSORA', 'NOTEBOOK', 'FONE DE OUVIDO']);

    equipamentosDepois?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

    // 6. Comparar resultados
    console.log('\n📈 COMPARAÇÃO:');
    equipamentosAntes?.forEach(eqAntes => {
      const eqDepois = equipamentosDepois?.find(eq => eq.nome === eqAntes.nome);
      if (eqDepois) {
        const diferenca = eqDepois.quantidade_cadastrada - eqAntes.quantidade_cadastrada;
        if (diferenca !== 0) {
          console.log(`   ${eqAntes.nome}: ${eqAntes.quantidade_cadastrada} → ${eqDepois.quantidade_cadastrada} (${diferenca > 0 ? '+' : ''}${diferenca})`);
        } else {
          console.log(`   ${eqAntes.nome}: ${eqAntes.quantidade_cadastrada} (sem alteração)`);
        }
      }
    });

    // 7. Verificar se a OS foi realmente alterada
    const { data: osVerificacao } = await supabase
      .from('ordens_servico')
      .select('equipamento')
      .eq('id', osTeste.id)
      .single();

    console.log(`\n✅ VERIFICAÇÃO FINAL:`);
    console.log(`   OS ${osTeste.numero_os} agora tem equipamento: ${osVerificacao?.equipamento}`);

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarAlteracaoEquipamento();
