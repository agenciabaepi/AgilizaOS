import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 SINCRONIZANDO CONTADORES AUTOMATICAMENTE...');

    const supabase = createAdminClient();

    // 1. Buscar todos os equipamentos_tipos
    const { data: equipamentos, error: equipamentosError } = await supabase
      .from('equipamentos_tipos')
      .select('id, nome, quantidade_cadastrada, empresa_id');

    if (equipamentosError) {
      console.error('❌ Erro ao buscar equipamentos:', equipamentosError);
      return NextResponse.json(
        { error: 'Erro ao buscar equipamentos' },
        { status: 500 }
      );
    }

    console.log(`📊 Encontrados ${equipamentos.length} tipos de equipamentos`);

    let contadoresAtualizados = 0;
    const resultados = [];

    // 2. Buscar contagem real diretamente da tabela ordens_servico
    console.log('🔍 Buscando contagem real da tabela ordens_servico...');
    
    const { data: contagemReal, error: contagemError } = await supabase
      .from('ordens_servico')
      .select('equipamento, empresa_id')
      .not('equipamento', 'is', null);

    if (contagemError) {
      console.error('❌ Erro ao buscar contagem real:', contagemError);
      return NextResponse.json(
        { error: 'Erro ao buscar contagem real' },
        { status: 500 }
      );
    }

    // 3. Contar por equipamento e empresa
    const contadoresReais: { [key: string]: number } = {};
    contagemReal?.forEach(os => {
      const key = `${os.empresa_id}-${os.equipamento}`;
      contadoresReais[key] = (contadoresReais[key] || 0) + 1;
    });

    console.log('📊 Contagem real encontrada:', contadoresReais);

    // 4. Atualizar cada equipamento com a contagem real
    for (const equipamento of equipamentos) {
      const key = `${equipamento.empresa_id}-${equipamento.nome}`;
      const quantidadeReal = contadoresReais[key] || 0;
      
      console.log(`🔍 ${equipamento.nome} (${equipamento.empresa_id}):`);
      console.log(`   📋 Contador atual: ${equipamento.quantidade_cadastrada}`);
      console.log(`   📊 Quantidade real: ${quantidadeReal}`);

      // Atualizar se necessário
      if (quantidadeReal !== equipamento.quantidade_cadastrada) {
        console.log(`   🔄 Atualizando de ${equipamento.quantidade_cadastrada} para ${quantidadeReal}`);
        
        const { error: updateError } = await supabase
          .from('equipamentos_tipos')
          .update({ quantidade_cadastrada: quantidadeReal })
          .eq('id', equipamento.id);

        if (updateError) {
          console.error(`   ❌ Erro ao atualizar:`, updateError);
          resultados.push({
            equipamento: equipamento.nome,
            empresa: equipamento.empresa_id,
            status: 'erro',
            mensagem: updateError.message
          });
        } else {
          console.log(`   ✅ Atualizado com sucesso!`);
          contadoresAtualizados++;
          resultados.push({
            equipamento: equipamento.nome,
            empresa: equipamento.empresa_id,
            status: 'atualizado',
            anterior: equipamento.quantidade_cadastrada,
            atual: quantidadeReal
          });
        }
      } else {
        console.log(`   ✅ Contador já está correto`);
        resultados.push({
          equipamento: equipamento.nome,
          empresa: equipamento.empresa_id,
          status: 'correto',
          valor: equipamento.quantidade_cadastrada
        });
      }
    }

    console.log(`🎉 SINCRONIZAÇÃO CONCLUÍDA!`);
    console.log(`📊 ${contadoresAtualizados} contadores foram atualizados`);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída. ${contadoresAtualizados} contadores atualizados.`,
      contadoresAtualizados,
      totalEquipamentos: equipamentos.length,
      resultados
    });

  } catch (error) {
    console.error('❌ Erro na sincronização automática:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
