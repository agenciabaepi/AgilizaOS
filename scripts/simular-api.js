const { createServerClient } = require('@supabase/ssr');

async function simularAPI() {
  console.log('🧪 SIMULANDO API DE CRIAÇÃO DE OS\n');

  try {
    // Simular cookies
    const cookieStore = {
      get: () => undefined
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name); },
          set() {},
          remove() {},
        },
      }
    );

    // Simular dados da OS (como vem do frontend)
    const dadosOS = {
      cliente_id: 'teste-cliente-id',
      tecnico_id: null,
      status: 'EM_ANALISE',
      equipamento: 'IMPRESSORA',
      empresa_id: '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed',
      numero_os: 'TESTE-002',
      marca: 'TESTE',
      modelo: 'TESTE',
      problema_relatado: 'Teste de contador'
    };

    console.log('📋 Dados da OS:', dadosOS);

    // Simular criação da OS (sem inserir realmente)
    console.log('\n1️⃣ Simulando criação da OS...');
    console.log('✅ OS seria criada com sucesso');

    // Simular atualização do contador (código exato da API)
    console.log('\n2️⃣ Simulando atualização do contador...');
    console.log('🔢 Atualizando contador de equipamentos...');
    console.log('📋 Dados da OS:', { equipamento: dadosOS.equipamento, empresa_id: dadosOS.empresa_id });
    
    try {
      if (dadosOS.equipamento) {
        console.log('🔍 Buscando equipamento:', dadosOS.equipamento);
        
        const { data: equipamentoData, error: equipamentoError } = await supabase
          .from('equipamentos_tipos')
          .select('id, quantidade_cadastrada')
          .eq('nome', dadosOS.equipamento)
          .eq('empresa_id', dadosOS.empresa_id)
          .single();

        console.log('🔍 Resultado da busca:', { equipamentoData, equipamentoError });

        if (!equipamentoError && equipamentoData) {
          console.log('✅ Equipamento encontrado:', equipamentoData);
          
          const novoValor = equipamentoData.quantidade_cadastrada + 1;
          console.log(`🔄 Incrementando contador de ${equipamentoData.quantidade_cadastrada} para ${novoValor}`);
          
          const { error: updateError } = await supabase
            .from('equipamentos_tipos')
            .update({ 
              quantidade_cadastrada: novoValor 
            })
            .eq('id', equipamentoData.id);

          if (updateError) {
            console.error('❌ Erro ao atualizar contador:', updateError);
          } else {
            console.log('✅ Contador atualizado para:', novoValor);
          }
        } else {
          console.log('⚠️ Equipamento não encontrado na tabela equipamentos_tipos:', equipamentoError);
        }
      } else {
        console.log('⚠️ Campo equipamento não preenchido na OS');
      }
    } catch (counterError) {
      console.error('❌ Erro ao atualizar contador de equipamentos:', counterError);
    }

    // Verificar resultado
    console.log('\n3️⃣ Verificando resultado:');
    const { data: equipamentosFinais } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .eq('nome', 'IMPRESSORA')
      .order('empresa_id');

    equipamentosFinais?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

simularAPI();
