const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarContagemReal() {
  console.log('🧪 TESTANDO CONTAGEM REAL BASEADA NA TABELA ORDENS_SERVICO\n');

  try {
    // 1. Buscar todos os equipamentos_tipos
    const { data: equipamentos } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id')
      .order('nome');

    console.log(`📊 Encontrados ${equipamentos.length} tipos de equipamentos\n`);

    // 2. Para cada equipamento, verificar a quantidade real
    for (const equipamento of equipamentos) {
      console.log(`🔍 Verificando: ${equipamento.nome} (empresa: ${equipamento.empresa_id})`);
      
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

      // 3. Atualizar se necessário
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
        }
      } else {
        console.log(`   ✅ Contador já está correto`);
      }
      
      console.log('');
    }

    console.log('🎉 VERIFICAÇÃO CONCLUÍDA!\n');

    // 4. Mostrar resultado final
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

testarContagemReal();
