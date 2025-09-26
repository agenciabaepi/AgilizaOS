const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function limparEquipamentosDuplicados() {
  console.log('🔍 Limpando equipamentos duplicados...\n');

  try {
    const empresaId = '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed';

    // Buscar todos os equipamentos
    const { data: equipamentos, error } = await supabase
      .from('equipamentos_tipos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (error) {
      console.log('❌ Erro ao buscar equipamentos:', error);
      return;
    }

    console.log('📋 Equipamentos encontrados:', equipamentos?.length || 0);
    
    if (equipamentos) {
      equipamentos.forEach(e => {
        console.log(`- ${e.nome} (${e.categoria})`);
      });
    }

    // Identificar duplicados por nome
    const nomes = equipamentos?.map(e => e.nome) || [];
    const duplicados = nomes.filter((nome, index) => nomes.indexOf(nome) !== index);
    
    if (duplicados.length > 0) {
      console.log('\n🔄 Duplicados encontrados:', duplicados);
      
      // Manter apenas o primeiro de cada duplicado
      for (const nome of duplicados) {
        const equipamentosComMesmoNome = equipamentos?.filter(e => e.nome === nome) || [];
        const equipamentosParaRemover = equipamentosComMesmoNome.slice(1); // Remove todos exceto o primeiro
        
        for (const equipamento of equipamentosParaRemover) {
          console.log(`🗑️ Removendo duplicado: ${equipamento.nome} (${equipamento.id})`);
          
          const { error: deleteError } = await supabase
            .from('equipamentos_tipos')
            .delete()
            .eq('id', equipamento.id);
            
          if (deleteError) {
            console.log('❌ Erro ao remover:', deleteError);
          } else {
            console.log('✅ Removido com sucesso');
          }
        }
      }
    } else {
      console.log('✅ Nenhum duplicado encontrado');
    }

    // Verificar resultado final
    console.log('\n📋 Verificando resultado final...');
    const { data: equipamentosFinais, error: finalError } = await supabase
      .from('equipamentos_tipos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (finalError) {
      console.log('❌ Erro ao verificar resultado:', finalError);
    } else {
      console.log('✅ Equipamentos finais:', equipamentosFinais?.length || 0);
      equipamentosFinais?.forEach(e => {
        console.log(`- ${e.nome} (${e.categoria})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

limparEquipamentosDuplicados();
