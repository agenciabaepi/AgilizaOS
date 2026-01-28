import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { sendOSApprovedNotification, sendOSStatusNotification } from '@/lib/whatsapp-notifications';

// Função auxiliar para normalizar status
function normalizeStatus(status: string): string {
  if (!status) return '';
  return status.trim().toUpperCase();
}

// Função auxiliar para formatar valores no histórico
function formatValorSimples(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return 'vazio';
  if (typeof valor === 'number') {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (valor instanceof Date) {
    return valor.toLocaleString('pt-BR');
  }
  return String(valor);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      osId, 
      newStatus, 
      newStatusTecnico, 
      empresa_id, 
      cliente_recusou,
      usuario_id,
      usuario_nome,
      ...updateData 
    } = body;

    if (!osId) {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Determinar se osId é UUID ou numero_os
    // Garantir que osId seja string antes de usar .includes()
    const osIdString = String(osId || '');
    const isUUID = osIdString.includes('-') && osIdString.length > 20;
    
    // Construir query baseada no tipo de ID
    let query = supabase
      .from('ordens_servico')
      .select(
        [
          'id',
          'numero_os',
          'empresa_id',
          'status',
          'status_tecnico',
          'tecnico_id',
          'cliente_id',
          'tipo',
          'data_entrega',
          'valor_faturado',
          'valor_servico',
          'valor_peca',
          // Campos de equipamento/descrição que queremos auditar no histórico
          'equipamento',
          'categoria',
          'marca',
          'modelo',
          'cor',
          'numero_serie',
          'problema_relatado',
          'observacao',
          'prazo_entrega',
          'acessorios',
          'condicoes_equipamento'
        ].join(', ')
      )
      .limit(1);

    if (isUUID) {
      query = query.eq('id', osIdString);
    } else {
      query = query.eq('numero_os', osIdString);
    }

    // Se empresa_id foi fornecido, filtrar por ele também
    if (empresa_id) {
      query = query.eq('empresa_id', empresa_id);
    }

    // Buscar a OS primeiro (antes de atualizar para ter dados anteriores)
    const { data: osAnterior, error: buscaError } = await query.single();

    if (buscaError || !osAnterior) {
      console.error('❌ Erro ao buscar OS:', buscaError);
      return NextResponse.json(
        { error: 'OS não encontrada' },
        { status: 404 }
      );
    }

    // Normalizar status para comparação
    const statusNormalizado = normalizeStatus(newStatus || '');
    const statusTecnicoNormalizado = normalizeStatus(newStatusTecnico || '');
    const seraFinalizada = statusNormalizado === 'ENTREGUE' || statusTecnicoNormalizado === 'FINALIZADA';
    
    // Preparar dados de atualização
    const dadosAtualizacao: any = {
      updated_at: new Date().toISOString(),
      ...updateData
    };

    // Definir data_entrega automaticamente se a OS está sendo finalizada
    if (seraFinalizada && !updateData.data_entrega) {
      const hoje = new Date();
      const dataStr = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())).toISOString().slice(0, 10);
      dadosAtualizacao.data_entrega = dataStr;
      console.log('📅 Data de entrega definida automaticamente:', dataStr);
    }

    // Adicionar status se fornecido
    if (newStatus) {
      dadosAtualizacao.status = newStatus;
    }

    // Adicionar status técnico se fornecido
    if (newStatusTecnico) {
      dadosAtualizacao.status_tecnico = newStatusTecnico;
    }

    // Atualizar a OS usando o ID UUID
    const { data: ordemAtualizada, error: updateError } = await supabase
      .from('ordens_servico')
      .update(dadosAtualizacao)
      .eq('id', osAnterior.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar OS:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar OS: ' + updateError.message },
        { status: 500 }
      );
    }

    // Registrar histórico de mudança de status em tabela dedicada, se houver mudança
    if (newStatus || newStatusTecnico) {
      try {
        const statusAnterior = osAnterior.status;
        const statusTecnicoAnterior = osAnterior.status_tecnico;
        
        const { error: historicoError } = await supabase
          .from('status_historico')
          .insert({
            os_id: osAnterior.id,
            status_anterior: statusAnterior,
            status_novo: newStatus || statusAnterior,
            status_tecnico_anterior: statusTecnicoAnterior,
            status_tecnico_novo: newStatusTecnico || statusTecnicoAnterior,
            empresa_id: osAnterior.empresa_id,
            created_at: new Date().toISOString()
          });

        if (historicoError) {
          console.warn('⚠️ Erro ao registrar histórico (não crítico):', historicoError);
        }
      } catch (historicoError) {
        console.warn('⚠️ Erro ao registrar histórico (não crítico):', historicoError);
      }
    }

    // ✅ REGISTRAR COMISSÃO SE A OS FOI FINALIZADA E CLIENTE NÃO RECUSOU
    // Buscar OS atualizada para verificar status final
    const { data: osAtualizada } = await supabase
      .from('ordens_servico')
      .select('status, status_tecnico, data_entrega, tecnico_id, valor_faturado, valor_servico, valor_peca, tipo, empresa_id, cliente_id')
      .eq('id', osAnterior.id)
      .single();
    
    const statusAtual = normalizeStatus(osAtualizada?.status || '');
    const statusTecnicoAtual = normalizeStatus(osAtualizada?.status_tecnico || '');
    const foiFinalizada = statusAtual === 'ENTREGUE' || statusTecnicoAtual === 'FINALIZADA';
    const temDataEntrega = osAtualizada?.data_entrega;
    const temTecnico = osAtualizada?.tecnico_id || osAnterior.tecnico_id;
    
    console.log('🔍 VERIFICAÇÃO DE COMISSÃO:', {
      foiFinalizada,
      temDataEntrega: !!temDataEntrega,
      temTecnico: !!temTecnico,
      clienteRecusou: !!cliente_recusou,
      statusAtual,
      statusTecnicoAtual,
      dataEntrega: temDataEntrega,
      tecnicoId: temTecnico,
      osId: osAnterior.id
    });
    
    // Não registrar comissão se cliente recusou o serviço
    if (foiFinalizada && temDataEntrega && temTecnico && !cliente_recusou) {
      console.log('💰 REGISTRANDO COMISSÃO - Técnico:', temTecnico, 'OS:', osAnterior.id);
      
      try {
        // Verificar se já existe comissão
        const { data: comissaoExistente } = await supabase
          .from('comissoes_historico')
          .select('id')
          .eq('ordem_servico_id', osAnterior.id)
          .maybeSingle();
        
        if (comissaoExistente) {
          console.log('⚠️ Comissão já existe para esta OS');
        } else {
          // Buscar dados do técnico
          // IMPORTANTE: tecnico_id na OS pode ser o auth_user_id, não o id da tabela usuarios
          const tecnicoIdParaBuscar = osAtualizada.tecnico_id || osAnterior.tecnico_id;
          console.log('🔍 Buscando técnico - ID da OS:', tecnicoIdParaBuscar);
          
          // Primeiro tentar buscar pelo id (caso seja o id real)
          let { data: tecnicoData, error: tecnicoError } = await supabase
            .from('usuarios')
            .select('id, tipo_comissao, comissao_fixa, comissao_percentual, empresa_id, nivel, nome, auth_user_id, comissao_ativa')
            .eq('id', tecnicoIdParaBuscar)
            .maybeSingle();
          
          // Se não encontrou pelo id, tentar buscar pelo auth_user_id
          if (!tecnicoData && !tecnicoError) {
            console.log('⚠️ Não encontrado pelo id, tentando buscar pelo auth_user_id...');
            const { data: tecnicoPorAuth, error: erroAuth } = await supabase
              .from('usuarios')
              .select('id, tipo_comissao, comissao_fixa, comissao_percentual, empresa_id, nivel, nome, auth_user_id, comissao_ativa')
              .eq('auth_user_id', tecnicoIdParaBuscar)
              .maybeSingle();
            
            if (tecnicoPorAuth && !erroAuth) {
              tecnicoData = tecnicoPorAuth;
              tecnicoError = null;
              console.log('✅ Técnico encontrado pelo auth_user_id! ID real:', tecnicoData.id);
            } else {
              tecnicoError = erroAuth;
            }
          }
          
          if (tecnicoError) {
            console.error('❌ Erro ao buscar técnico:', {
              error: tecnicoError,
              code: tecnicoError.code,
              message: tecnicoError.message,
              details: tecnicoError.details,
              hint: tecnicoError.hint
            });
          } else if (tecnicoData) {
            console.log('✅ Técnico encontrado:', { 
              id: tecnicoData.id, 
              nome: tecnicoData.nome,
              nivel: tecnicoData.nivel, 
              empresa_id: tecnicoData.empresa_id,
              comissao_ativa: tecnicoData.comissao_ativa
            });
            
            // ✅ VERIFICAR SE O TÉCNICO TEM COMISSÃO ATIVA
            // Se comissao_ativa = false, não registrar comissão
            if (tecnicoData.comissao_ativa === false) {
              console.log('⏭️ COMISSÃO NÃO SERÁ REGISTRADA: Técnico tem comissão desativada', {
                tecnicoId: tecnicoData.id,
                tecnicoNome: tecnicoData.nome,
                comissao_ativa: tecnicoData.comissao_ativa
              });
              // Não registrar comissão para técnico desativado
              tecnicoData = null; // Marcar como null para não processar
            }
            
            // Verificar se é técnico
            if (tecnicoData && tecnicoData.nivel !== 'tecnico') {
              console.log('⏭️ COMISSÃO NÃO SERÁ REGISTRADA: Usuário não é técnico', {
                nome: tecnicoData.nome,
                nivel: tecnicoData.nivel
              });
              tecnicoData = null;
            }
          } else {
            console.warn('⚠️ Técnico não retornado pela query');
          }
          
          // Se encontrou técnico válido, calcular e registrar comissão
          if (tecnicoData) {
            // Buscar configuração padrão da empresa
            const { data: configData } = await supabase
              .from('configuracoes_comissao')
              .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao')
              .eq('empresa_id', tecnicoData.empresa_id)
              .maybeSingle();
            
            // Determinar tipo e valor de comissão
            let tipoComissao = 'porcentagem';
            let valorComissao = 10; // Padrão 10%
            
            if (tecnicoData.tipo_comissao) {
              tipoComissao = tecnicoData.tipo_comissao;
              if (tipoComissao === 'fixo') {
                valorComissao = tecnicoData.comissao_fixa || 0;
              } else {
                valorComissao = tecnicoData.comissao_percentual || 10;
              }
            } else if (configData?.tipo_comissao) {
              tipoComissao = configData.tipo_comissao;
              if (tipoComissao === 'fixo') {
                valorComissao = configData.comissao_fixa_padrao || 0;
              } else {
                valorComissao = configData.comissao_padrao || 10;
              }
            }
            
            // Calcular valor da comissão
            const valorFaturado = osAtualizada.valor_faturado || 0;
            let valorComissaoCalculado = 0;
            if (tipoComissao === 'fixo') {
              valorComissaoCalculado = valorComissao;
            } else {
              valorComissaoCalculado = valorFaturado * valorComissao / 100;
            }
            
            console.log('💰 CÁLCULO DA COMISSÃO:', {
              tipoComissao,
              valorComissao,
              valorFaturado,
              valorComissaoCalculado
            });
            
            // Usar o id real do técnico (não o auth_user_id) para inserir na comissão
            const tecnicoIdReal = tecnicoData.id;
            
            // Preparar dados para inserção
            const dadosComissao: any = {
              tecnico_id: tecnicoIdReal,
              ordem_servico_id: osAnterior.id,
              empresa_id: osAtualizada.empresa_id || osAnterior.empresa_id,
              cliente_id: osAtualizada.cliente_id || osAnterior.cliente_id,
              valor_servico: osAtualizada.valor_servico || 0,
              valor_peca: osAtualizada.valor_peca || 0,
              valor_total: valorFaturado,
              tipo_comissao: tipoComissao,
              valor_comissao: valorComissaoCalculado,
              data_entrega: osAtualizada.data_entrega,
              data_calculo: new Date().toISOString(),
              status: 'CALCULADA',
              tipo_ordem: (osAtualizada.tipo || 'normal').toLowerCase(),
              observacoes: null
            };
            
            // Adicionar campos condicionais
            if (tipoComissao === 'porcentagem') {
              dadosComissao.percentual_comissao = valorComissao;
            } else {
              dadosComissao.valor_comissao_fixa = valorComissao;
              dadosComissao.percentual_comissao = 0;
            }
            
            console.log('📋 DADOS DA COMISSÃO A SEREM INSERIDOS:', dadosComissao);
            
            // Registrar comissão
            const { data: comissaoInserida, error: comissaoError } = await supabase
              .from('comissoes_historico')
              .insert(dadosComissao)
              .select();
            
            if (comissaoError) {
              console.error('❌ ERRO AO REGISTRAR COMISSÃO:', {
                error: comissaoError,
                message: comissaoError.message,
                code: comissaoError.code,
                details: comissaoError.details,
                hint: comissaoError.hint
              });
            } else {
              console.log('✅✅✅ COMISSÃO REGISTRADA COM SUCESSO!', {
                id: comissaoInserida?.[0]?.id,
                valor: valorComissaoCalculado,
                tipo: tipoComissao
              });
            }
          }
        }
      } catch (comissaoError) {
        console.error('❌ ERRO GERAL AO PROCESSAR COMISSÃO:', comissaoError);
        // Não falha a atualização da OS por causa da comissão
      }
    } else {
      console.log('⏭️ COMISSÃO NÃO SERÁ REGISTRADA:', {
        motivo: cliente_recusou ? 'Cliente recusou o serviço' : !foiFinalizada ? 'OS não finalizada' : !temDataEntrega ? 'Sem data de entrega' : !temTecnico ? 'Sem técnico' : 'Desconhecido',
        foiFinalizada,
        temDataEntrega,
        temTecnico,
        clienteRecusou: cliente_recusou
      });
    }

    // ✅ REGISTRAR HISTÓRICO DETALHADO (os_historico) PARA CAMPOS ALTERADOS
    try {
      // Campos que queremos auditar no histórico geral da OS
      const camposMonitorados = [
        'status',
        'status_tecnico',
        'equipamento',
        'categoria',
        'marca',
        'modelo',
        'cor',
        'numero_serie',
        'problema_relatado',
        'observacao',
        'valor_faturado',
        'valor_servico',
        'valor_peca',
        'data_entrega',
        'prazo_entrega',
        'acessorios',
        'condicoes_equipamento',
        'tecnico_id',
        'cliente_id'
      ] as const;

      type CampoMonitorado = (typeof camposMonitorados)[number];

      const alteracoes: Array<{
        campo: CampoMonitorado;
        valorAnterior: unknown;
        valorNovo: unknown;
      }> = [];

      for (const campo of camposMonitorados) {
        if (campo in dadosAtualizacao) {
          const valorAnterior = (osAnterior as any)[campo];
          const valorNovo = (dadosAtualizacao as any)[campo];

          // Comparação segura, tratando null/undefined igual
          const anteriorNorm = valorAnterior ?? null;
          const novoNorm = valorNovo ?? null;

          if (JSON.stringify(anteriorNorm) !== JSON.stringify(novoNorm)) {
            alteracoes.push({ campo, valorAnterior, valorNovo });
          }
        }
      }

      if (alteracoes.length > 0) {
        const labelPorCampo: Record<CampoMonitorado, string> = {
          status: 'Status',
          status_tecnico: 'Status Técnico',
          equipamento: 'Equipamento',
          categoria: 'Categoria',
          marca: 'Marca',
          modelo: 'Modelo',
          cor: 'Cor',
          numero_serie: 'Número de Série',
          problema_relatado: 'Problema Relatado',
          observacao: 'Observações Internas',
          valor_faturado: 'Valor Faturado',
          valor_servico: 'Valor de Serviço',
          valor_peca: 'Valor de Peças',
          data_entrega: 'Data de Entrega',
          prazo_entrega: 'Prazo de Entrega',
          acessorios: 'Acessórios',
          condicoes_equipamento: 'Condições do Equipamento',
          tecnico_id: 'Técnico Responsável',
          cliente_id: 'Cliente'
        };

        for (const alt of alteracoes) {
          const label = labelPorCampo[alt.campo] || alt.campo;
          const valorAnteriorFmt = formatValorSimples(alt.valorAnterior);
          const valorNovoFmt = formatValorSimples(alt.valorNovo);

          const isStatusField = alt.campo === 'status' || alt.campo === 'status_tecnico';
          const acao = isStatusField ? 'STATUS_CHANGE' : 'FIELD_CHANGE';
          const categoria = isStatusField ? 'STATUS' : 'DETALHES';
          const descricao = `Campo ${label} alterado de "${valorAnteriorFmt}" para "${valorNovoFmt}"`;

          try {
            // Tentar usar a função SQL centralizada
            const { error: histError } = await supabase.rpc('registrar_historico_os', {
              p_os_id: osAnterior.id,
              p_acao: acao,
              p_categoria: categoria,
              p_descricao: descricao,
              p_detalhes: JSON.stringify({
                campo: alt.campo,
                valor_anterior: alt.valorAnterior,
                valor_novo: alt.valorNovo
              }),
              p_valor_anterior: valorAnteriorFmt,
              p_valor_novo: valorNovoFmt,
              p_campo_alterado: alt.campo,
              p_usuario_id: usuario_id || null,
              p_motivo: null,
              p_observacoes: null,
              p_ip_address: null,
              p_user_agent: null,
              p_origem: 'API_UPDATE_STATUS'
            });

            if (histError) {
              console.warn('⚠️ Erro em registrar_historico_os, usando fallback direto:', histError);

              const { error: insertError } = await supabase
                .from('os_historico')
                .insert({
                  os_id: osAnterior.id,
                  numero_os: osAnterior.numero_os,
                  acao,
                  categoria,
                  descricao,
                  detalhes: JSON.stringify({
                    campo: alt.campo,
                    valor_anterior: alt.valorAnterior,
                    valor_novo: alt.valorNovo
                  }),
                  valor_anterior: valorAnteriorFmt,
                  valor_novo: valorNovoFmt,
                  campo_alterado: alt.campo,
                  usuario_id: usuario_id || null,
                  usuario_nome: usuario_nome || null,
                  empresa_id: osAnterior.empresa_id,
                  origem: 'API_UPDATE_STATUS'
                });

              if (insertError) {
                console.warn('⚠️ Erro no fallback de inserção em os_historico:', insertError);
              }
            }
          } catch (histError) {
            console.warn('⚠️ Erro inesperado ao registrar histórico detalhado:', histError);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Falha geral ao registrar histórico detalhado da OS (não crítico):', e);
    }

    // Enviar notificações WhatsApp se necessário (já desativadas por padrão)
    try {
      const newStatusString = newStatus ? String(newStatus) : '';
      if (newStatusString === 'APROVADO' || (newStatusString && newStatusString.toLowerCase().includes('aprovado'))) {
        await sendOSApprovedNotification(osAnterior.id);
      } else if (newStatusString) {
        await sendOSStatusNotification(osAnterior.id, newStatusString);
      }
    } catch (notifError) {
      console.warn('⚠️ Erro ao enviar notificação WhatsApp (não crítico):', notifError);
    }

    return NextResponse.json({
      success: true,
      data: ordemAtualizada,
      message: 'OS atualizada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro interno ao atualizar OS:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error.message || 'Erro desconhecido') },
      { status: 500 }
    );
  }
}
