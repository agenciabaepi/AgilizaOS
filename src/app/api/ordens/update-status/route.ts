import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificarN8nOSAprovada, notificarN8nStatusOS, gerarLinkOS } from '@/lib/n8n-integration';

export async function POST(request: NextRequest) {
  try {
    const { osId, newStatus, newStatusTecnico, ...updateData } = await request.json();

    if (!osId) {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🔄 Atualizando status da OS:', {
      osId,
      newStatus,
      newStatusTecnico,
      updateData: updateData
    });

    // Preparar cliente Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );


    // ✅ CORREÇÃO CRÍTICA: Filtrar campos vazios para evitar perda de dados
    const finalUpdateData: any = {};
    
    // Sempre atualizar status se fornecido
    if (newStatus) finalUpdateData.status = newStatus;
    if (newStatusTecnico) finalUpdateData.status_tecnico = newStatusTecnico;
    
    // ✅ FILTRAR campos vazios - MAS SEMPRE incluir checklist_entrada
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      
      // SEMPRE incluir checklist_entrada, mesmo se vazio (para limpar)
      if (key === 'checklist_entrada') {
        finalUpdateData[key] = value;
        return;
      }
      
      // Para outros campos, só incluir se não for vazio, null, undefined ou string vazia
      // Permitir '0' para valores monetários válidos
      if (value !== null && value !== undefined && value !== '') {
        finalUpdateData[key] = value;
      }
    });
    
    console.log('📝 Dados filtrados para atualização (sem campos vazios):', finalUpdateData);

    // ✅ BUSCAR EQUIPAMENTO ANTERIOR ANTES DE ATUALIZAR
    console.log('🔍 Buscando equipamento anterior ANTES de atualizar...');
    const { data: osAnterior, error: osAnteriorError } = await supabase
      .from('ordens_servico')
      .select('equipamento, empresa_id, id')
      .eq('id', osId)
      .single();

    if (osAnteriorError) {
      console.error('❌ Erro ao buscar OS anterior:', osAnteriorError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados da OS' },
        { status: 500 }
      );
    }

    const equipamentoAnterior = osAnterior?.equipamento;
    const equipamentoNovo = finalUpdateData.equipamento;
    const empresaId = osAnterior?.empresa_id;

    console.log('🔍 Equipamento anterior:', equipamentoAnterior);
    console.log('🔍 Equipamento novo:', equipamentoNovo);
    console.log('🔍 Empresa ID:', empresaId);

    // Atualizar dados completos da OS no banco de dados
    const { data, error } = await supabase
      .from('ordens_servico')
      .update(finalUpdateData)
      .eq('id', osAnterior.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar status da OS:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar status da OS' },
        { status: 500 }
      );
    }

    console.log('✅ Status da OS atualizado com sucesso:', data);

    // ✅ ATUALIZAR CONTADOR DE EQUIPAMENTOS (se equipamento foi alterado)
    console.log('🔢 Verificando atualização do contador de equipamentos...');
    console.log('📋 Dados da atualização:', { equipamento: finalUpdateData.equipamento, osId });
    
    try {

      // Se o equipamento mudou, recalcular contadores baseado na quantidade real
      if (equipamentoAnterior !== equipamentoNovo && empresaId) {
        console.log('🔄 Equipamento alterado! Recalculando contadores...');

        // Lista de equipamentos que precisam ter contadores atualizados
        const equipamentosParaAtualizar = [];
        if (equipamentoAnterior) equipamentosParaAtualizar.push(equipamentoAnterior);
        if (equipamentoNovo) equipamentosParaAtualizar.push(equipamentoNovo);

        // Para cada equipamento, contar a quantidade real na tabela ordens_servico
        for (const nomeEquipamento of equipamentosParaAtualizar) {
          console.log(`🔍 Recalculando contador para ${nomeEquipamento}...`);
          
          // Contar quantidade real na tabela ordens_servico
          const { count: quantidadeReal, error: countError } = await supabase
            .from('ordens_servico')
            .select('*', { count: 'exact', head: true })
            .eq('equipamento', nomeEquipamento)
            .eq('empresa_id', empresaId);

          if (countError) {
            console.error(`❌ Erro ao contar ${nomeEquipamento}:`, countError);
            continue;
          }

          const quantidadeFinal = quantidadeReal || 0;
          console.log(`📊 ${nomeEquipamento}: quantidade real = ${quantidadeFinal}`);

          // Buscar o equipamento na tabela equipamentos_tipos
          const { data: equipamentoData } = await supabase
            .from('equipamentos_tipos')
            .select('id, quantidade_cadastrada')
            .eq('nome', nomeEquipamento)
            .eq('empresa_id', empresaId)
            .single();

          if (equipamentoData) {
            console.log(`📈 Atualizando ${nomeEquipamento} de ${equipamentoData.quantidade_cadastrada} para ${quantidadeFinal}`);
            
            const { error: updateCounterError } = await supabase
              .from('equipamentos_tipos')
              .update({ quantidade_cadastrada: quantidadeFinal })
              .eq('id', equipamentoData.id);

            if (updateCounterError) {
              console.error(`❌ Erro ao atualizar contador:`, updateCounterError);
            } else {
              console.log(`✅ ${nomeEquipamento} atualizado com sucesso!`);
            }
          } else {
            console.log(`⚠️ Equipamento ${nomeEquipamento} não encontrado na tabela equipamentos_tipos`);
          }
        }
      } else {
        console.log('✅ Equipamento não alterado ou empresa_id não encontrado, contadores mantidos');
      }
    } catch (counterError) {
      console.error('❌ Erro ao atualizar contador de equipamentos:', counterError);
      // Não falha a atualização da OS se o contador falhar
    }

    // ✅ ENVIAR NOTIFICAÇÃO N8N PARA APROVAÇÃO OU MUDANÇA DE STATUS
    if (newStatus || newStatusTecnico) {
      console.log('📱 Enviando notificação N8N para mudança de status...');
      try {
        // Buscar dados completos da OS para notificação
        const { data: osCompleta, error: osCompletaError } = await supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            empresa_id,
            tecnico_id,
            status,
            status_tecnico,
            servico,
            equipamento,
            valor_faturado,
            clientes!inner(nome, telefone),
            usuarios!inner(nome, whatsapp)
          `)
          .eq('id', osId)
          .single();

        if (!osCompletaError && osCompleta) {
          const normalize = (s: string) => (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
          const statusNormalizado = normalize(newStatus || osCompleta.status);
          
          // Preparar payload base
          const n8nPayload = {
            os_id: osCompleta.id,
            empresa_id: osCompleta.empresa_id,
            tecnico_nome: (osCompleta.usuarios as any)?.nome || 'Técnico não informado',
            tecnico_whatsapp: (osCompleta.usuarios as any)?.whatsapp || '',
            cliente_nome: (osCompleta.clientes as any)?.nome || 'Cliente não informado',
            cliente_telefone: (osCompleta.clientes as any)?.telefone || '',
            equipamento: osCompleta.equipamento || 'Equipamento não especificado',
            servico: osCompleta.servico || 'Serviço não especificado',
            numero_os: osCompleta.numero_os,
            status: newStatus || osCompleta.status,
            valor: osCompleta.valor_faturado || 0,
            link_os: gerarLinkOS(osCompleta.id)
          };

          // Decidir qual webhook usar baseado no status
          let n8nSuccess = false;
          if (statusNormalizado === 'APROVADO') {
            console.log('🎉 Status APROVADO detectado - enviando para webhook de aprovação');
            n8nSuccess = await notificarN8nOSAprovada(n8nPayload);
          } else {
            console.log('🔄 Mudança de status geral - enviando para webhook de status');
            n8nSuccess = await notificarN8nStatusOS(n8nPayload);
          }
          
          if (n8nSuccess) {
            console.log('✅ Notificação N8N enviada com sucesso');
          } else {
            console.warn('⚠️ Falha ao enviar notificação N8N');
          }
        } else {
          console.warn('⚠️ Erro ao buscar dados completos da OS para notificação:', osCompletaError);
        }
      } catch (notificationError) {
        console.error('❌ Erro ao enviar notificação N8N:', notificationError);
        // Não falha a atualização por causa da notificação
      }
    }

    // ✅ REGISTRAR MUDANÇA NO HISTÓRICO
    console.log('📝 Registrando mudança no histórico...');
    try {
      // Buscar dados anteriores da OS para comparar
      const { data: osAnterior } = await supabase
        .from('ordens_servico')
        .select('id, status, status_tecnico')
        .eq('id', osId)
        .single();
      
      // Determinar se houve mudança de status
      const statusAnterior = osAnterior?.status;
      const statusTecnicoAnterior = osAnterior?.status_tecnico;
      
      const statusMudou = newStatus && newStatus !== statusAnterior;
      const statusTecnicoMudou = newStatusTecnico && newStatusTecnico !== statusTecnicoAnterior;
      
      console.log('🔍 DEBUG HISTÓRICO: Verificando mudanças:', {
        statusAnterior,
        statusTecnicoAnterior,
        newStatus,
        newStatusTecnico,
        statusMudou,
        statusTecnicoMudou,
        deveRegistrar: statusMudou || statusTecnicoMudou
      });
      
      if (statusMudou || statusTecnicoMudou) {
        const { error: historicoError } = await supabase
          .from('status_historico')
          .insert({
            os_id: osAnterior.id,
            status_anterior: statusAnterior,
            status_novo: newStatus || statusAnterior,
            status_tecnico_anterior: statusTecnicoAnterior,
            status_tecnico_novo: newStatusTecnico || statusTecnicoAnterior,
            usuario_id: null, // Será preenchido pelo sistema
            usuario_nome: 'Sistema',
            motivo: statusMudou ? 'Mudança de status' : 'Mudança de status técnico',
            observacoes: `Status atualizado via API`
          });
          
        if (historicoError) {
          console.warn('⚠️ Erro ao registrar histórico:', historicoError);
        } else {
          console.log('✅ Mudança registrada no histórico');
        }
      }
    } catch (historicoError) {
      console.warn('⚠️ Erro ao registrar histórico:', historicoError);
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Status atualizado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro interno ao atualizar status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
