const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarAPIReal() {
  console.log('🧪 TESTANDO API REAL DE ALTERAÇÃO\n');

  try {
    // 1. Buscar uma OS para testar
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

    // 3. Simular chamada da API via HTTP
    console.log(`\n🔄 Simulando chamada HTTP para API...`);
    
    const response = await fetch(`http://localhost:3001/api/ordens/${osTeste.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}` // Simular autenticação
      },
      body: JSON.stringify({
        equipamento: 'FONE DE OUVIDO',
        empresa_id: osTeste.empresa_id,
        status: 'EM_ANALISE' // Manter status atual
      })
    });

    console.log(`📡 Status da resposta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na API: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Resposta da API:', result);

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

    // 5. Verificar se a OS foi alterada
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

testarAPIReal();
