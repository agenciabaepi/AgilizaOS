import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sendNewOSNotification } from '@/lib/whatsapp-notifications';
import { notificarNovaOSN8N, gerarURLOs, formatarWhatsApp } from '@/lib/n8n-nova-os';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );
    const dadosOS = await request.json();
    // Verificar se empresa_id já está presente nos dados
    if (!dadosOS.empresa_id) {
      return NextResponse.json(
        { error: 'empresa_id não fornecido nos dados da OS' },
        { status: 400 }
      );
    }

    // Criar a OS no banco de dados
    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .insert([dadosOS])
      .select()
      .single();

    if (osError) {
      console.error('Erro ao salvar OS:', osError);
      return NextResponse.json(
        { error: 'Erro ao criar a Ordem de Serviço: ' + osError.message },
        { status: 500 }
      );
    }

    // ✅ REGISTRAR STATUS INICIAL NO HISTÓRICO
    console.log('📝 Registrando status inicial no histórico...');
    try {
      const { error: historicoError } = await supabase
        .from('status_historico')
        .insert({
          os_id: osData.id,
          status_anterior: null,
          status_novo: osData.status || 'ABERTA',
          status_tecnico_anterior: null,
          status_tecnico_novo: osData.status_tecnico || null,
          usuario_id: dadosOS.usuario_id || null,
          usuario_nome: 'Sistema',
          motivo: 'OS criada',
          observacoes: 'Ordem de serviço criada inicialmente'
        });
        
      if (historicoError) {
        console.warn('⚠️ Erro ao registrar histórico inicial:', historicoError);
      } else {
        console.log('✅ Status inicial registrado no histórico');
      }
    } catch (historicoError) {
      console.warn('⚠️ Erro ao registrar histórico inicial:', historicoError);
    }

    // ✅ ENVIAR NOTIFICAÇÃO WHATSAPP PARA NOVA OS (via N8N - webhook novo-aparelho)
    console.log('📱 Enviando notificação WhatsApp para nova OS via N8N (webhook novo-aparelho)...');
    try {
      // Buscar dados completos da OS incluindo cliente
      const { data: osCompleta, error: osCompletaError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          marca,
          modelo,
          problema_relatado,
          status,
          tecnico_id,
          clientes!inner(nome)
        `)
        .eq('id', osData.id)
        .single();

      // Buscar dados do técnico separadamente usando o tecnico_id da OS
      let tecnico = null;
      if (!osCompletaError && osCompleta?.tecnico_id) {
        const { data: tecnicoData, error: tecnicoError } = await supabase
          .from('usuarios')
          .select('nome, whatsapp, tecnico_id')
          .eq('tecnico_id', osCompleta.tecnico_id)
          .single();
        
        if (!tecnicoError && tecnicoData) {
          tecnico = tecnicoData;
        }
      }

      if (!osCompletaError && osCompleta) {
        const cliente = osCompleta.clientes as any;
        
        // ✅ DEBUG: Log dos dados recebidos
        console.log('🔍 N8N: Dados da OS encontrados:', {
          os_id: osCompleta.id,
          numero_os: osCompleta.numero_os,
          tecnico_id: osCompleta.tecnico_id,
          tecnico_data: tecnico,
          cliente_data: cliente,
          marca: osCompleta.marca,
          modelo: osCompleta.modelo,
          problema_relatado: osCompleta.problema_relatado,
          status: osCompleta.status
        });
        
        // Montar descrição do equipamento com marca e modelo
        const equipamento = `${osCompleta.marca || 'Marca não informada'} ${osCompleta.modelo || 'Modelo não informado'}`.trim();
        const tecnicoWhatsApp = formatarWhatsApp(tecnico?.whatsapp || '');
        const clienteNome = cliente?.nome || 'Cliente não informado';
        const defeito = osCompleta.problema_relatado || 'Defeito não especificado';
        const status = osCompleta.status || 'Pendente';

        // Verificar se temos os dados necessários
        if (!tecnicoWhatsApp) {
          console.warn('⚠️ N8N: WhatsApp do técnico não encontrado, pulando notificação');
        } else {
          // Preparar payload completo para o webhook novo-aparelho
          const n8nPayload = {
            numero_os: parseInt(osCompleta.numero_os), // Converter para número
            cliente_nome: clienteNome,
            equipamento: equipamento,
            defeito: defeito,
            status: status,
            tecnico_nome: tecnico?.nome || 'Técnico não informado',
            tecnico_whatsapp: tecnicoWhatsApp,
            link_os: gerarURLOs(osCompleta.id)
          };

          console.log('📱 N8N: Enviando payload completo para webhook novo-aparelho:', n8nPayload);

          // Enviar para N8N usando webhook específico
          const n8nSuccess = await notificarNovaOSN8N(n8nPayload);
          
          if (n8nSuccess) {
            console.log('✅ N8N: Notificação enviada com sucesso para webhook novo-aparelho');
          } else {
            console.warn('⚠️ N8N: Falha ao enviar notificação para webhook novo-aparelho');
          }
        }

        // Fallback: também tentar método antigo
        const notificationSent = await sendNewOSNotification(osData.id);
        console.log('📱 Notificação WhatsApp (fallback):', notificationSent ? 'Enviada com sucesso' : 'Falha no envio');
      } else {
        console.warn('⚠️ N8N: Erro ao buscar dados completos da OS:', osCompletaError);
        // Fallback para método antigo
        const notificationSent = await sendNewOSNotification(osData.id);
        console.log('📱 Notificação WhatsApp (fallback):', notificationSent ? 'Enviada com sucesso' : 'Falha no envio');
      }
    } catch (notificationError) {
      console.error('❌ N8N: Erro ao enviar notificação de nova OS:', notificationError);
      // Não falha a criação da OS se a notificação falhar
    }

    return NextResponse.json({ 
      success: true, 
      data: osData,
      notificationSent: true // Indica que tentamos enviar a notificação
    });

  } catch (error) {
    console.error('Erro geral ao criar OS:', error);
    console.error('Detalhes do erro:', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Erro inesperado ao criar a Ordem de Serviço: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 