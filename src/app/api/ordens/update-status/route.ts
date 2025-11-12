import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOSApprovedNotification, sendOSStatusNotification } from '@/lib/whatsapp-notifications';

export async function POST(request: NextRequest) {
  try {
    const { osId: osIdRaw, newStatus, newStatusTecnico, ...updateData } = await request.json();

    // Normalizar osId: aceitar UUID (id) ou numero_os (numérico)
    let osId = osIdRaw as string;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!osId || osId.toString().trim() === '') {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }

    // Preparar cliente Supabase (service role para bypass de RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Se não for UUID, tratar como numero_os e resolver para o UUID
    if (!uuidRegex.test(String(osId))) {
      console.log('🔍 Buscando OS pelo numero_os:', osId, 'Tipo:', typeof osId);
      
      // Tentar buscar como número primeiro
      const numeroOS = typeof osId === 'string' ? parseInt(osId, 10) : osId;
      console.log('🔍 numero_os convertido para número:', numeroOS, 'É NaN?', isNaN(numeroOS));
      
      // Tentar buscar como número
      let { data: osPorNumero, error: numeroError } = await supabase
        .from('ordens_servico')
        .select('id, numero_os')
        .eq('numero_os', numeroOS)
        .single();
      
      // Se não encontrou como número, tentar como string
      if (numeroError || !osPorNumero?.id) {
        console.log('⚠️ Não encontrou como número, tentando como string...');
        const { data: osPorString, error: stringError } = await supabase
          .from('ordens_servico')
          .select('id, numero_os')
          .eq('numero_os', String(osId))
          .single();
        
        if (osPorString?.id) {
          osPorNumero = osPorString;
          numeroError = null;
          console.log('✅ Encontrado como string:', osPorString);
        } else {
          console.error('❌ Erro ao buscar por número:', numeroError);
          console.error('❌ Erro ao buscar por string:', stringError);
          return NextResponse.json(
            { 
              error: 'OS não encontrada pelo numero_os', 
              numeroOS: osId,
              tipo: typeof osId,
              supabaseError: numeroError || stringError,
              debug: {
                tentouNumero: numeroOS,
                tentouString: String(osId),
                erroNumero: numeroError,
                erroString: stringError
              }
            },
            { status: 400 }
          );
        }
      }
      
      if (!osPorNumero?.id) {
        return NextResponse.json(
          { error: 'OS não encontrada pelo numero_os', numeroOS: osId },
          { status: 400 }
        );
      }
      
      console.log('✅ OS encontrada pelo numero_os:', osPorNumero.numero_os, 'ID:', osPorNumero.id);
      osId = osPorNumero.id as string;
    }

    console.log('🔄 Atualizando status da OS:', {
      osId,
      newStatus,
      newStatusTecnico,
      updateData: updateData
    });

    // supabase já definido acima


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
        { error: 'Erro ao buscar dados da OS', supabaseError: osAnteriorError },
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
    const { error } = await supabase
      .from('ordens_servico')
      .update(finalUpdateData)
      .eq('id', osAnterior.id)
      .select();

    if (error) {
      console.error('❌ Erro ao atualizar status da OS:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar status da OS', supabaseError: error },
        { status: 500 }
      );
    }

    console.log('✅ Status da OS atualizado com sucesso');

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

    // ✅ ENVIAR NOTIFICAÇÃO WHATSAPP DIRETA PARA APROVAÇÃO OU MUDANÇA DE STATUS
    if (newStatus || newStatusTecnico) {
      console.log('📱 Enviando notificação WhatsApp para mudança de status...');
      try {
        const normalize = (s: string) => (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
        const statusNormalizado = normalize(newStatus || '');
        
        // Enviar notificação direta via WhatsApp
        let notificationSuccess = false;
        if (statusNormalizado === 'APROVADO') {
          console.log('🎉 Status APROVADO detectado - enviando notificação de aprovação');
          notificationSuccess = await sendOSApprovedNotification(osId);
        } else if (newStatus) {
          console.log('🔄 Mudança de status geral - enviando notificação de status');
          notificationSuccess = await sendOSStatusNotification(osId, newStatus);
        }
        
        if (notificationSuccess) {
          console.log('✅ Notificação WhatsApp enviada com sucesso');
        } else {
          console.warn('⚠️ Falha ao enviar notificação WhatsApp');
        }
      } catch (notificationError) {
        console.error('❌ Erro ao enviar notificação WhatsApp:', notificationError);
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

    return NextResponse.json({ success: true, message: 'Status atualizado com sucesso' });

  } catch (error) {
    console.error('❌ Erro interno ao atualizar status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
