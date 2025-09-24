import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
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
    const supabase = createAdminClient();


    // ✅ CORREÇÃO CRÍTICA: Filtrar campos vazios para evitar perda de dados
    const finalUpdateData: any = {};
    
    // Sempre atualizar status se fornecido
    if (newStatus) finalUpdateData.status = newStatus;
    if (newStatusTecnico) finalUpdateData.status_tecnico = newStatusTecnico;
    
    // ✅ FILTRAR campos vazios - só atualizar se há conteúdo real
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      // Só incluir se não for vazio, null, undefined ou string vazia
      // Permitir '0' para valores monetários válidos
      if (value !== null && value !== undefined && value !== '') {
        finalUpdateData[key] = value;
      }
    });
    
    console.log('📝 Dados filtrados para atualização (sem campos vazios):', finalUpdateData);

    // Atualizar dados completos da OS no banco de dados
    const { data, error } = await supabase
      .from('ordens_servico')
      .update(finalUpdateData)
      .eq('id', osId)
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
        .select('status, status_tecnico')
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
            os_id: osId,
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
