const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function corrigirTodosContadores() {
  console.log('🔧 CORRIGINDO TODOS OS CONTADORES DE EQUIPAMENTOS\n');

  try {
    // 1. Buscar todos os equipamentos_tipos
    const { data: equipamentos, error: equipamentosError } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, empresa_id, quantidade_cadastrada');

    if (equipamentosError) {
      console.error('❌ Erro ao buscar equipamentos:', equipamentosError);
      return;
    }

    console.log(`📊 Encontrados ${equipamentos.length} tipos de equipamentos\n`);

    // 2. Para cada equipamento, contar quantas OS existem
    for (const equipamento of equipamentos) {
      console.log(`🔍 Processando: ${equipamento.nome} (empresa: ${equipamento.empresa_id})`);
      
      // Contar OS com este equipamento
      const { count, error: countError } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('equipamento', equipamento.nome)
        .eq('empresa_id', equipamento.empresa_id);

      if (countError) {
        console.error(`❌ Erro ao contar OS para ${equipamento.nome}:`, countError);
        continue;
      }

      const quantidadeReal = count || 0;
      console.log(`   📋 OS encontradas: ${quantidadeReal}`);
      console.log(`   📊 Contador atual: ${equipamento.quantidade_cadastrada}`);

      // 3. Atualizar o contador se necessário
      if (quantidadeReal !== equipamento.quantidade_cadastrada) {
        console.log(`   🔄 Atualizando contador de ${equipamento.quantidade_cadastrada} para ${quantidadeReal}`);
        
        const { error: updateError } = await supabase
          .from('equipamentos_tipos')
          .update({ quantidade_cadastrada: quantidadeReal })
          .eq('id', equipamento.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${equipamento.nome}:`, updateError);
        } else {
          console.log(`   ✅ Contador atualizado com sucesso!`);
        }
      } else {
        console.log(`   ✅ Contador já está correto`);
      }
      
      console.log('');
    }

    console.log('🎉 CORREÇÃO CONCLUÍDA!\n');

    // 4. Verificar resultado final
    console.log('📊 RESULTADO FINAL:');
    const { data: equipamentosFinais } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    equipamentosFinais?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos (empresa: ${eq.empresa_id})`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

corrigirTodosContadores();
