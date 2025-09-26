const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarAtualizacaoContador() {
  console.log('🧪 TESTANDO ATUALIZAÇÃO DO CONTADOR\n');

  try {
    // Simular dados de uma OS
    const dadosOS = {
      equipamento: 'CELULAR',
      empresa_id: '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed'
    };

    console.log('📋 Dados simulados:', dadosOS);

    // Buscar o equipamento
    console.log('🔍 Buscando equipamento:', dadosOS.equipamento);
    const { data: equipamentoData, error: equipamentoError } = await supabase
      .from('equipamentos_tipos')
      .select('id, quantidade_cadastrada')
      .eq('nome', dadosOS.equipamento)
      .eq('empresa_id', dadosOS.empresa_id)
      .single();

    if (equipamentoError) {
      console.error('❌ Erro ao buscar equipamento:', equipamentoError);
      return;
    }

    if (!equipamentoData) {
      console.error('❌ Equipamento não encontrado');
      return;
    }

    console.log('✅ Equipamento encontrado:', equipamentoData);

    // Incrementar o contador
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
      console.log('✅ Contador atualizado com sucesso!');

      // Verificar se foi atualizado
      const { data: equipamentoAtualizado } = await supabase
        .from('equipamentos_tipos')
        .select('quantidade_cadastrada')
        .eq('id', equipamentoData.id)
        .single();
      
      console.log(`📊 Valor confirmado: ${equipamentoAtualizado?.quantidade_cadastrada}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarAtualizacaoContador();
