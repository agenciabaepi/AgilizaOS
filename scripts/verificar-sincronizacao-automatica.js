const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarSincronizacaoAutomatica() {
  console.log('🔄 VERIFICANDO SINCRONIZAÇÃO AUTOMÁTICA\n');

  try {
    // 1. Verificar contadores atuais
    console.log('📊 CONTADORES ATUAIS:');
    const { data: equipamentos } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    equipamentos?.forEach(eq => {
      console.log(`   - ${eq.nome} (${eq.empresa_id}): ${eq.quantidade_cadastrada} usos`);
    });

    // 2. Contar quantidade real na tabela ordens_servico
    console.log('\n📊 CONTAGEM REAL NA TABELA ORDENS_SERVICO:');
    const { data: ordens } = await supabase
      .from('ordens_servico')
      .select('equipamento, empresa_id')
      .not('equipamento', 'is', null);

    const contagemReal = {};
    ordens?.forEach(os => {
      const key = `${os.empresa_id}-${os.equipamento}`;
      contagemReal[key] = (contagemReal[key] || 0) + 1;
    });

    Object.entries(contagemReal).forEach(([key, count]) => {
      const [empresaId, equipamento] = key.split('-');
      console.log(`   - ${equipamento} (${empresaId}): ${count} usos`);
    });

    // 3. Comparar e identificar discrepâncias
    console.log('\n🔍 COMPARANDO CONTADORES:');
    let discrepanciaEncontrada = false;
    
    equipamentos?.forEach(eq => {
      const key = `${eq.empresa_id}-${eq.nome}`;
      const contagemRealEquipamento = contagemReal[key] || 0;
      
      if (eq.quantidade_cadastrada !== contagemRealEquipamento) {
        console.log(`❌ DISCREPÂNCIA: ${eq.nome} (${eq.empresa_id})`);
        console.log(`   Contador atual: ${eq.quantidade_cadastrada}`);
        console.log(`   Contagem real: ${contagemRealEquipamento}`);
        discrepanciaEncontrada = true;
      } else {
        console.log(`✅ OK: ${eq.nome} (${eq.empresa_id}): ${eq.quantidade_cadastrada}`);
      }
    });

    if (discrepanciaEncontrada) {
      console.log('\n🔄 DISCREPÂNCIAS ENCONTRADAS! Chamando API de sincronização...');
      
      const response = await fetch('http://localhost:3001/api/sincronizar-contadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Sincronização executada:', result);
        
        // Verificar contadores após sincronização
        console.log('\n📊 CONTADORES APÓS SINCRONIZAÇÃO:');
        const { data: equipamentosDepois } = await supabase
          .from('equipamentos_tipos')
          .select('nome, quantidade_cadastrada, empresa_id')
          .order('nome');

        equipamentosDepois?.forEach(eq => {
          console.log(`   - ${eq.nome} (${eq.empresa_id}): ${eq.quantidade_cadastrada} usos`);
        });
      } else {
        console.error('❌ Erro na sincronização:', response.status);
      }
    } else {
      console.log('\n✅ TODOS OS CONTADORES ESTÃO CORRETOS!');
    }

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

verificarSincronizacaoAutomatica();
