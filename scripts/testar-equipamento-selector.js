const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarEquipamentoSelector() {
  console.log('🧪 TESTANDO EQUIPAMENTO SELECTOR\n');

  try {
    // 1. Buscar uma OS para testar
    const { data: ordens } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .not('equipamento', 'is', null)
      .limit(1);

    if (!ordens || ordens.length === 0) {
      console.error('❌ Nenhuma OS com equipamento encontrada');
      return;
    }

    const osTeste = ordens[0];
    console.log(`📋 OS selecionada: ${osTeste.numero_os}`);
    console.log(`📱 Equipamento atual: ${osTeste.equipamento}`);
    console.log(`🏢 Empresa: ${osTeste.empresa_id}\n`);

    // 2. Buscar equipamentos da empresa
    console.log('🔍 Buscando equipamentos da empresa...');
    const { data: equipamentos, error: equipamentosError } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, categoria, ativo')
      .eq('empresa_id', osTeste.empresa_id)
      .eq('ativo', true)
      .order('nome');

    if (equipamentosError) {
      console.error('❌ Erro ao buscar equipamentos:', equipamentosError);
      return;
    }

    console.log(`📊 Equipamentos encontrados: ${equipamentos.length}`);
    equipamentos.forEach(eq => {
      console.log(`   - ${eq.nome} (${eq.categoria})`);
    });

    // 3. Verificar se o equipamento da OS está na lista
    const equipamentoEncontrado = equipamentos.find(eq => eq.nome === osTeste.equipamento);
    
    console.log(`\n🔍 VERIFICAÇÃO:`);
    console.log(`   Equipamento da OS: "${osTeste.equipamento}"`);
    console.log(`   Encontrado na lista: ${equipamentoEncontrado ? '✅ SIM' : '❌ NÃO'}`);
    
    if (equipamentoEncontrado) {
      console.log(`   Detalhes: ${equipamentoEncontrado.nome} (${equipamentoEncontrado.categoria})`);
    } else {
      console.log(`   ⚠️ PROBLEMA: O equipamento "${osTeste.equipamento}" não está na lista de equipamentos ativos!`);
      console.log(`   Isso pode causar bugs no EquipamentoSelector.`);
    }

    // 4. Verificar se há equipamentos inativos com esse nome
    console.log(`\n🔍 Verificando equipamentos inativos...`);
    const { data: equipamentosInativos } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, categoria, ativo')
      .eq('empresa_id', osTeste.empresa_id)
      .eq('nome', osTeste.equipamento)
      .eq('ativo', false);

    if (equipamentosInativos && equipamentosInativos.length > 0) {
      console.log(`   ⚠️ Encontrado equipamento inativo: ${equipamentosInativos[0].nome}`);
      console.log(`   Isso explica por que não aparece no selector!`);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarEquipamentoSelector();
