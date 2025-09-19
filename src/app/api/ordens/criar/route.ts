import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sendNewOSNotification } from '@/lib/whatsapp-notifications';

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

    // Enviar notificação WhatsApp para o técnico responsável
    console.log('🔔 Enviando notificação de nova OS para técnico...');
    try {
      const notificationSent = await sendNewOSNotification(osData.id);
      console.log('📱 Notificação de nova OS:', notificationSent ? 'Enviada com sucesso' : 'Falha no envio');
    } catch (notificationError) {
      console.error('❌ Erro ao enviar notificação de nova OS:', notificationError);
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