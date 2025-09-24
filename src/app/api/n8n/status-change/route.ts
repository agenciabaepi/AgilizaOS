import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { notificarN8nOSAprovada, notificarN8nStatusOS, gerarLinkOS } from '@/lib/n8n-integration';

export async function POST(request: NextRequest) {
  try {
    const { os_id, status_anterior, status_novo, status_tecnico_anterior, status_tecnico_novo, empresa_id } = await request.json();

    if (!os_id || !empresa_id) {
      return NextResponse.json(
        { error: 'os_id e empresa_id são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('📡 N8N: Processando mudança de status via hook:', {
      os_id,
      status_anterior,
      status_novo,
      status_tecnico_anterior,
      status_tecnico_novo,
      empresa_id
    });

    // Buscar dados completos da OS
    const supabase = createAdminClient();
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
      .eq('id', os_id)
      .eq('empresa_id', empresa_id)
      .single();

    if (osCompletaError || !osCompleta) {
      console.error('❌ N8N: Erro ao buscar dados da OS:', osCompletaError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados da OS' },
        { status: 500 }
      );
    }

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
      status: status_novo || osCompleta.status,
      valor: osCompleta.valor_faturado || 0,
      link_os: gerarLinkOS(osCompleta.id),
      status_anterior: status_anterior,
      status_tecnico_anterior: status_tecnico_anterior,
      status_tecnico_novo: status_tecnico_novo
    };

    // Decidir qual webhook usar baseado no status
    const normalize = (s: string) => (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const statusNormalizado = normalize(status_novo || osCompleta.status);
    
    let n8nSuccess = false;
    if (statusNormalizado === 'APROVADO') {
      console.log('🎉 N8N: Status APROVADO detectado via hook - enviando para webhook de aprovação');
      n8nSuccess = await notificarN8nOSAprovada(n8nPayload);
    } else {
      console.log('🔄 N8N: Mudança de status geral via hook - enviando para webhook de status');
      n8nSuccess = await notificarN8nStatusOS(n8nPayload);
    }

    if (n8nSuccess) {
      console.log('✅ N8N: Notificação via hook enviada com sucesso');
      return NextResponse.json({
        success: true,
        message: 'Notificação N8N enviada com sucesso',
        payload: n8nPayload
      });
    } else {
      console.warn('⚠️ N8N: Falha ao enviar notificação via hook');
      return NextResponse.json(
        { error: 'Falha ao enviar notificação N8N' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ N8N: Erro interno ao processar mudança de status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
