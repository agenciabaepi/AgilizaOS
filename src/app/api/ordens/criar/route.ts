import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sendNewOSNotification } from '@/lib/whatsapp-notifications';

// Força execução no runtime Node.js (garante logs completos na Vercel)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  console.log('🚀 API /api/ordens/criar chamada!');
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
    
    // Log do payload recebido ANTES de processar (warn para aparecer no Vercel)
    console.warn('[Webhook OS][PROD] payload recebido:', JSON.stringify(dadosOS, null, 2));
    console.warn('[Webhook OS][PROD] campos críticos:', {
      equipamento: dadosOS.equipamento,
      modelo: dadosOS.modelo,
      problema_relatado: dadosOS.problema_relatado,
      servico: dadosOS.servico,
      tecnico_id: dadosOS.tecnico_id
    });

    // Modo de diagnóstico: se passar ?debug=1, finaliza logo após logar
    const debug = request.nextUrl?.searchParams?.get('debug');
    if (debug === '1') {
      console.warn('[Webhook OS][DEBUG] Encerrando cedo para garantir flush de logs');
      return NextResponse.json({ ok: true, debug: true });
    }
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

    // ✅ ATUALIZAR CONTADOR DE EQUIPAMENTOS
    console.log('🔢 Atualizando contador de equipamentos...');
    console.log('📋 Dados da OS:', { equipamento: dadosOS.equipamento, empresa_id: dadosOS.empresa_id });
    try {
      if (dadosOS.equipamento) {
        console.log('🔍 Buscando equipamento:', dadosOS.equipamento);
        
        // Buscar o equipamento na tabela equipamentos_tipos
        const { data: equipamentoData, error: equipamentoError } = await supabase
          .from('equipamentos_tipos')
          .select('id, quantidade_cadastrada')
          .eq('nome', dadosOS.equipamento)
          .eq('empresa_id', dadosOS.empresa_id)
          .single();

        console.log('🔍 Resultado da busca:', { equipamentoData, equipamentoError });

        if (!equipamentoError && equipamentoData) {
          console.log('✅ Equipamento encontrado:', equipamentoData);
          
          // Contar quantidade real na tabela ordens_servico (incluindo a OS que acabou de ser criada)
          const { count: quantidadeReal, error: countError } = await supabase
            .from('ordens_servico')
            .select('*', { count: 'exact', head: true })
            .eq('equipamento', dadosOS.equipamento)
            .eq('empresa_id', dadosOS.empresa_id);

          if (countError) {
            console.error(`❌ Erro ao contar ${dadosOS.equipamento}:`, countError);
          } else {
            const quantidadeFinal = quantidadeReal || 0;
            console.log(`📊 ${dadosOS.equipamento}: quantidade real = ${quantidadeFinal}`);
            console.log(`📈 Atualizando ${dadosOS.equipamento} de ${equipamentoData.quantidade_cadastrada} para ${quantidadeFinal}`);
            
            const { error: updateError } = await supabase
              .from('equipamentos_tipos')
              .update({ quantidade_cadastrada: quantidadeFinal })
              .eq('id', equipamentoData.id);

            if (updateError) {
              console.error('❌ Erro ao atualizar contador:', updateError);
            } else {
              console.log(`✅ ${dadosOS.equipamento} atualizado com sucesso!`);
            }
          }
        } else {
          console.log('⚠️ Equipamento não encontrado na tabela equipamentos_tipos:', equipamentoError);
        }
      } else {
        console.log('⚠️ Campo equipamento não preenchido na OS');
      }
    } catch (counterError) {
      console.error('❌ Erro ao atualizar contador de equipamentos:', counterError);
      // Não falha a criação da OS se o contador falhar
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

    // ✅ ENVIAR NOTIFICAÇÃO WHATSAPP DIRETA PARA NOVA OS (SEM N8N)
    console.log('📱 Enviando notificação WhatsApp direta para nova OS...');
    try {
      const notificationSuccess = await sendNewOSNotification(osData.id);
      
      if (notificationSuccess) {
        console.log('✅ Notificação WhatsApp enviada com sucesso para nova OS');
      } else {
        console.warn('⚠️ Falha ao enviar notificação WhatsApp para nova OS');
      }
    } catch (notificationError) {
      console.error('❌ Erro ao enviar notificação WhatsApp de nova OS:', notificationError);
      // Não falha a criação da OS se a notificação falhar
    }

    return NextResponse.json({ 
      success: true, 
      data: osData,
      notificationSent: true // Indica que tentamos enviar a notificação
    });

  } catch (error) {
    console.error('[Webhook OS][ERRO] Erro geral ao criar OS:', error);
    console.error('[Webhook OS][ERRO] Detalhes do erro:', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Erro inesperado ao criar a Ordem de Serviço: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 