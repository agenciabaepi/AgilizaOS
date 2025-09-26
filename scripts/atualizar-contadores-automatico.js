const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function atualizarContadoresAutomaticamente() {
  console.log('🔄 ATUALIZANDO CONTADORES AUTOMATICAMENTE\n');

  try {
    // 1. Buscar todos os equipamentos_tipos
    const { data: equipamentos, error: equipamentosError } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id');

    if (equipamentosError) {
      console.error('❌ Erro ao buscar equipamentos:', equipamentosError);
      return;
    }

    console.log(`📊 Encontrados ${equipamentos.length} tipos de equipamentos\n`);

    // 2. Para cada equipamento, contar quantidade real e atualizar
    let contadoresAtualizados = 0;
    
    for (const equipamento of equipamentos) {
      console.log(`🔍 Processando: ${equipamento.nome} (empresa: ${equipamento.empresa_id})`);
      
      // Contar quantidade real na tabela ordens_servico
      const { count: quantidadeReal, error: countError } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('equipamento', equipamento.nome)
        .eq('empresa_id', equipamento.empresa_id);

      if (countError) {
        console.error(`❌ Erro ao contar ${equipamento.nome}:`, countError);
        continue;
      }

      const quantidadeFinal = quantidadeReal || 0;
      console.log(`   📋 Contador atual: ${equipamento.quantidade_cadastrada}`);
      console.log(`   📊 Quantidade real: ${quantidadeFinal}`);

      // Atualizar se necessário
      if (quantidadeFinal !== equipamento.quantidade_cadastrada) {
        console.log(`   🔄 Atualizando de ${equipamento.quantidade_cadastrada} para ${quantidadeFinal}`);
        
        const { error: updateError } = await supabase
          .from('equipamentos_tipos')
          .update({ quantidade_cadastrada: quantidadeFinal })
          .eq('id', equipamento.id);

        if (updateError) {
          console.error(`   ❌ Erro ao atualizar:`, updateError);
        } else {
          console.log(`   ✅ Atualizado com sucesso!`);
          contadoresAtualizados++;
        }
      } else {
        console.log(`   ✅ Contador já está correto`);
      }
      
      console.log('');
    }

    console.log(`🎉 ATUALIZAÇÃO CONCLUÍDA!`);
    console.log(`📊 ${contadoresAtualizados} contadores foram atualizados`);

    // 3. Mostrar resultado final
    console.log('\n📊 RESULTADO FINAL:');
    const { data: equipamentosFinais } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    equipamentosFinais?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

  } catch (error) {
    console.error('❌ Erro na atualização automática:', error);
  }
}

atualizarContadoresAutomaticamente();
