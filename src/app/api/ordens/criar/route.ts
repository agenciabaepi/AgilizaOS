import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sendNewOSNotification } from '@/lib/whatsapp-notifications';
import { notificarNovaOSN8N, gerarURLOs, formatarWhatsApp } from '@/lib/n8n-nova-os';
import { buildOSWebhookPayload } from '@/lib/sanitize-os-data';

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
    
    // Log do payload recebido ANTES de processar
    console.log('[Webhook OS][PROD] payload recebido:', JSON.stringify(dadosOS, null, 2));
    console.log('[Webhook OS][PROD] campos críticos:', {
      equipamento: dadosOS.equipamento,
      modelo: dadosOS.modelo,
      problema_relatado: dadosOS.problema_relatado,
      servico: dadosOS.servico,
      tecnico_id: dadosOS.tecnico_id
    });
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
          equipamento,
          servico,
          status,
          tecnico_id,
          clientes!inner(nome, telefone)
        `)
        .eq('id', osData.id)
        .single();

      // Buscar dados do técnico separadamente usando o tecnico_id da OS
      let tecnico = null;
      if (!osCompletaError && osCompleta?.tecnico_id) {
        console.log('🔍 N8N: Buscando técnico com ID:', osCompleta.tecnico_id);
        
        const { data: tecnicoData, error: tecnicoError } = await supabase
          .from('usuarios')
          .select('nome, whatsapp, tecnico_id')
          .eq('id', osCompleta.tecnico_id)  // ✅ Corrigido: comparar com id da tabela usuarios
          .single();
        
        if (!tecnicoError && tecnicoData) {
          tecnico = tecnicoData;
          console.log('✅ N8N: Dados do técnico encontrados:', tecnicoData);
        } else {
          console.error('❌ N8N: Erro ao buscar dados do técnico:', tecnicoError);
          console.log('🔍 N8N: Tentando buscar técnico com ID:', osCompleta.tecnico_id);
          
          // Fallback: tentar buscar por tecnico_id na tabela usuarios
          console.log('🔄 N8N: Tentando fallback - buscar por tecnico_id...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('usuarios')
            .select('nome, whatsapp, tecnico_id')
            .eq('tecnico_id', osCompleta.tecnico_id)
            .single();
          
          if (!fallbackError && fallbackData) {
            tecnico = fallbackData;
            console.log('✅ N8N: Dados do técnico encontrados via fallback:', fallbackData);
          } else {
            console.error('❌ N8N: Fallback também falhou:', fallbackError);
          }
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
        const clienteNome = cliente?.nome || 'Cliente não informado';
        const defeito = osCompleta.problema_relatado || 'Defeito não especificado';
        const status = osCompleta.status || 'Pendente';

        // ✅ CORREÇÃO DEFINITIVA: Buscar técnico por auth_user_id (correto)
        console.log('🔍 N8N: Buscando técnico por auth_user_id:', osCompleta.tecnico_id);
        
        let tecnicoFinal = null;
        if (osCompleta.tecnico_id) {
          const { data: tecnicoDireto, error: errorDireto } = await supabase
            .from('usuarios')
            .select('id, auth_user_id, nome, whatsapp')
            .eq('auth_user_id', osCompleta.tecnico_id)  // ✅ Corrigido: usar auth_user_id
            .single();
          
          console.log('🔍 N8N: Resultado da busca por auth_user_id:', {
            tecnico: tecnicoDireto,
            error: errorDireto,
            auth_user_id_buscado: osCompleta.tecnico_id
          });
          
          if (!errorDireto && tecnicoDireto) {
            tecnicoFinal = tecnicoDireto;
            console.log('✅ N8N: Técnico encontrado via auth_user_id:', tecnicoFinal);
          }
        }

        // Verificar se temos dados válidos do técnico
        if (!tecnicoFinal || !tecnicoFinal.nome || !tecnicoFinal.whatsapp) {
          console.error('❌ N8N: Não foi possível encontrar dados válidos do técnico, pulando notificação');
          console.log('🔍 N8N: Dados finais do técnico:', tecnicoFinal);
          return;
        }

        // Usar dados do técnico encontrado
        const tecnicoNome = tecnicoFinal.nome;
        const tecnicoWhatsApp = formatarWhatsApp(tecnicoFinal.whatsapp);
        
        console.log('✅ N8N: Dados finais do técnico validados:', {
          nome: tecnicoNome,
          whatsapp: tecnicoWhatsApp,
          tecnico_id: osCompleta.tecnico_id
        });

        // Log do objeto de origem ANTES do mapeamento
        const sourceData = {
          os_id: osCompleta.id,
          numero_os: osCompleta.numero_os,
          status: osCompleta.status,
          cliente_nome: clienteNome,
          cliente_telefone: cliente?.telefone,
          equipamento: osCompleta.equipamento,
          modelo: osCompleta.modelo,
          problema_relatado: osCompleta.problema_relatado,
          servico: osCompleta.servico,
          tecnico_nome: tecnicoNome,
          tecnico_whatsapp: tecnicoFinal.whatsapp,
        };
        
        console.log('[Webhook OS][PROD] src:', JSON.stringify({ body: sourceData }, null, 2));

        // Preparar payload sanitizado para webhook
        const n8nPayload = buildOSWebhookPayload({
          ...sourceData,
          link_os: gerarURLOs(osCompleta.id)
        });

        // Log do payload APÓS sanitização
        console.log('[Webhook OS][PROD] payload:', JSON.stringify(n8nPayload, null, 2));
        console.log(`[Build] version=${process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || 'unknown'}`);

        // Enviar para N8N usando webhook específico
        const n8nSuccess = await notificarNovaOSN8N(n8nPayload);
        
        if (n8nSuccess) {
          console.log('✅ N8N: Notificação enviada com sucesso para webhook novo-aparelho');
        } else {
          console.warn('⚠️ N8N: Falha ao enviar notificação para webhook novo-aparelho');
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