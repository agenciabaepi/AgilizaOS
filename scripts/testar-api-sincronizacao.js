const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarAPISincronizacao() {
  console.log('🧪 TESTANDO API DE SINCRONIZAÇÃO\n');

  try {
    // 1. Verificar contadores antes
    console.log('📊 CONTADORES ANTES:');
    const { data: equipamentosAntes } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    equipamentosAntes?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

    // 2. Chamar API de sincronização
    console.log('\n🔄 Chamando API de sincronização...');
    
    const response = await fetch('http://localhost:3001/api/sincronizar-contadores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Status da resposta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na API: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Resposta da API:', result);

    // 3. Verificar contadores depois
    console.log('\n📊 CONTADORES DEPOIS:');
    const { data: equipamentosDepois } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    equipamentosDepois?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

    console.log('\n🎉 TESTE CONCLUÍDO!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarAPISincronizacao();
