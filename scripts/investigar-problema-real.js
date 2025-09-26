const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigarProblemaReal() {
  console.log('🔍 INVESTIGANDO PROBLEMA REAL\n');

  try {
    // 1. Verificar TODAS as OS com equipamento
    console.log('1️⃣ TODAS AS OS COM EQUIPAMENTO:');
    const { data: todasOS, error: todasOSError } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id, created_at')
      .not('equipamento', 'is', null)
      .order('numero_os');

    if (todasOSError) {
      console.error('❌ Erro ao buscar OS:', todasOSError);
      return;
    }

    console.log(`📋 Total de OS com equipamento: ${todasOS.length}`);
    todasOS.forEach(os => {
      console.log(`   - OS ${os.numero_os}: ${os.equipamento} (empresa: ${os.empresa_id})`);
    });

    // 2. Contar manualmente por equipamento
    console.log('\n2️⃣ CONTAGEM MANUAL:');
    const contagemManual = {};
    todasOS.forEach(os => {
      const key = `${os.empresa_id}-${os.equipamento}`;
      contagemManual[key] = (contagemManual[key] || 0) + 1;
    });

    Object.entries(contagemManual).forEach(([key, count]) => {
      const [empresaId, equipamento] = key.split('-');
      console.log(`   - ${equipamento} (${empresaId}): ${count} usos`);
    });

    // 3. Verificar equipamentos_tipos
    console.log('\n3️⃣ EQUIPAMENTOS_TIPOS ATUAIS:');
    const { data: equipamentos } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    equipamentos?.forEach(eq => {
      const key = `${eq.empresa_id}-${eq.nome}`;
      const contagemReal = contagemManual[key] || 0;
      
      console.log(`\n📊 ${eq.nome} (${eq.empresa_id}):`);
      console.log(`   Contador atual: ${eq.quantidade_cadastrada}`);
      console.log(`   Contagem real: ${contagemReal}`);
      
      if (eq.quantidade_cadastrada !== contagemReal) {
        console.log(`   ❌ DISCREPÂNCIA: ${contagemReal - eq.quantidade_cadastrada}`);
      } else {
        console.log(`   ✅ Contador correto`);
      }
    });

    // 4. Testar criação de uma OS nova
    console.log('\n4️⃣ TESTANDO CRIAÇÃO DE OS NOVA:');
    
    // Buscar um cliente para teste
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, empresa_id')
      .limit(1);

    if (clientes && clientes.length > 0) {
      const clienteTeste = clientes[0];
      console.log(`📋 Cliente teste: ${clienteTeste.id} (empresa: ${clienteTeste.empresa_id})`);
      
      // Criar OS de teste
      const { data: novaOS, error: criarError } = await supabase
        .from('ordens_servico')
        .insert({
          cliente_id: clienteTeste.id,
          empresa_id: clienteTeste.empresa_id,
          equipamento: 'TESTE',
          problema_relatado: 'Teste de contador',
          status: 'EM_ANALISE'
        })
        .select()
        .single();

      if (criarError) {
        console.error('❌ Erro ao criar OS teste:', criarError);
      } else {
        console.log(`✅ OS teste criada: ${novaOS.numero_os}`);
        
        // Verificar se o contador foi atualizado
        const { data: equipamentoTeste } = await supabase
          .from('equipamentos_tipos')
          .select('quantidade_cadastrada')
          .eq('nome', 'TESTE')
          .eq('empresa_id', clienteTeste.empresa_id)
          .single();

        if (equipamentoTeste) {
          console.log(`📊 Contador TESTE após criação: ${equipamentoTeste.quantidade_cadastrada}`);
        } else {
          console.log('⚠️ Equipamento TESTE não encontrado na tabela equipamentos_tipos');
        }
        
        // Limpar OS de teste
        await supabase
          .from('ordens_servico')
          .delete()
          .eq('id', novaOS.id);
        
        console.log('🧹 OS de teste removida');
      }
    }

  } catch (error) {
    console.error('❌ Erro na investigação:', error);
  }
}

investigarProblemaReal();
