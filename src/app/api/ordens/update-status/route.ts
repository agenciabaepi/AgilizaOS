import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOSApprovedNotification, sendOSStatusNotification } from '@/lib/whatsapp-notifications';

export async function POST(request: NextRequest) {
  try {
    const { osId: osIdRaw, newStatus, newStatusTecnico, empresa_id, cliente_recusou, ...updateData } = await request.json();

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
      
      let osPorNumero: any = null;
      let ultimoErro: any = null;
      
      // Como numero_os é VARCHAR(50), tentar como string primeiro (mais provável)
      // IMPORTANTE: Filtrar por empresa_id se fornecido para evitar múltiplos resultados
      console.log('🔍 Tentativa 1: Buscando como string:', String(osId), 'empresa_id:', empresa_id);
      
      let queryString = supabase
        .from('ordens_servico')
        .select('id, numero_os, empresa_id')
        .eq('numero_os', String(osId));
      
      // Se empresa_id foi fornecido, filtrar por ele também
      if (empresa_id) {
        queryString = queryString.eq('empresa_id', empresa_id);
      }
      
      const { data: osPorString, error: stringError } = await queryString.maybeSingle();
      
      if (!stringError && osPorString?.id) {
        osPorNumero = osPorString;
        console.log('✅ Encontrado como string:', osPorString);
      } else {
        ultimoErro = stringError;
        console.log('⚠️ Não encontrado como string, erro:', stringError);
        
        // Tentar como número (caso o banco aceite conversão)
        const numeroOS = typeof osId === 'string' ? parseInt(osId, 10) : Number(osId);
        if (!isNaN(numeroOS)) {
          console.log('🔍 Tentativa 2: Buscando como número:', numeroOS, 'empresa_id:', empresa_id);
          
          let queryNum = supabase
            .from('ordens_servico')
            .select('id, numero_os, empresa_id')
            .eq('numero_os', numeroOS);
          
          // Se empresa_id foi fornecido, filtrar por ele também
          if (empresa_id) {
            queryNum = queryNum.eq('empresa_id', empresa_id);
          }
          
          const { data: osPorNum, error: numError } = await queryNum.maybeSingle();
          
          if (!numError && osPorNum?.id) {
            osPorNumero = osPorNum;
            console.log('✅ Encontrado como número:', osPorNum);
          } else {
            ultimoErro = numError || stringError;
            console.log('⚠️ Não encontrado como número, erro:', numError);
            
            // Se deu erro de múltiplas linhas, buscar todas e pegar a primeira
            if (numError?.code === 'PGRST116' || stringError?.code === 'PGRST116') {
              console.log('⚠️ Múltiplas OSs encontradas, buscando todas...');
              let queryMulti = supabase
                .from('ordens_servico')
                .select('id, numero_os, empresa_id')
                .eq('numero_os', String(osId));
              
              if (empresa_id) {
                queryMulti = queryMulti.eq('empresa_id', empresa_id);
              }
              
              const { data: todasOS, error: multiError } = await queryMulti.limit(10);
              
              if (!multiError && todasOS && todasOS.length > 0) {
                console.log('📊 Múltiplas OSs encontradas:', todasOS.length, todasOS);
                // Pegar a primeira (ou a que corresponde à empresa se fornecido)
                osPorNumero = empresa_id 
                  ? todasOS.find(os => os.empresa_id === empresa_id) || todasOS[0]
                  : todasOS[0];
                console.log('✅ Usando primeira OS encontrada:', osPorNumero);
              }
            }
          }
        }
      }
      
      // Se ainda não encontrou, buscar algumas OSs para debug
      if (!osPorNumero?.id) {
        console.log('🔍 Tentativa 3: Buscando algumas OSs para debug...');
        const { data: algumasOS, error: debugError } = await supabase
          .from('ordens_servico')
          .select('id, numero_os')
          .limit(5);
        
        console.log('📊 Primeiras 5 OSs no banco:', algumasOS);
        console.log('📊 Tipos de numero_os:', algumasOS?.map(os => ({ 
          numero: os.numero_os, 
          tipo: typeof os.numero_os,
          valor: JSON.stringify(os.numero_os)
        })));
        
        return NextResponse.json(
          { 
            error: 'OS não encontrada pelo numero_os', 
            numeroOS: osId,
            tipo: typeof osId,
            supabaseError: ultimoErro,
            debug: {
              tentouString: String(osId),
              tentouNumero: typeof osId === 'string' ? parseInt(osId, 10) : Number(osId),
              erro: ultimoErro,
              exemplosNoBanco: algumasOS?.slice(0, 3)
            }
          },
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
    
    // ✅ DEFINIR data_entrega AUTOMATICAMENTE se OS foi finalizada
    const normalizeStatus = (s: string) => (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const statusNormalizado = normalizeStatus(newStatus || '');
    const statusTecnicoNormalizado = normalizeStatus(newStatusTecnico || '');
    const seraFinalizada = statusNormalizado === 'ENTREGUE' || statusTecnicoNormalizado === 'FINALIZADA';
    
    if (seraFinalizada && !updateData.data_entrega) {
      const hoje = new Date();
      const dataStr = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())).toISOString().slice(0, 10);
      finalUpdateData.data_entrega = dataStr;
      console.log('📅 Data de entrega definida automaticamente:', dataStr);
    }
    
    // ✅ FILTRAR campos vazios - MAS SEMPRE incluir checklist_entrada e cliente_recusou
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      
      // SEMPRE incluir checklist_entrada, mesmo se vazio (para limpar)
      if (key === 'checklist_entrada') {
        finalUpdateData[key] = value;
        return;
      }
      
      // SEMPRE incluir cliente_recusou (pode ser false ou true)
      if (key === 'cliente_recusou') {
        finalUpdateData[key] = value === true || value === 'true';
        return;
      }
      
      // Para campos de texto (peca, servico), sempre incluir mesmo se vazio (para permitir limpar)
      if (key === 'peca' || key === 'servico') {
        finalUpdateData[key] = value || '';
        return;
      }
      
      // Para outros campos, só incluir se não for vazio, null, undefined ou string vazia
      // Permitir '0' para valores monetários válidos
      if (value !== null && value !== undefined && value !== '') {
        finalUpdateData[key] = value;
      }
    });
    
    console.log('📝 Dados filtrados para atualização (sem campos vazios):', finalUpdateData);

    // ✅ BUSCAR DADOS ANTERIORES DA OS ANTES DE ATUALIZAR
    console.log('🔍 Buscando dados anteriores da OS ANTES de atualizar...');
    const { data: osAnterior, error: osAnteriorError } = await supabase
      .from('ordens_servico')
      .select('equipamento, empresa_id, id, tecnico_id, cliente_id, valor_faturado, valor_servico, valor_peca, tipo, data_entrega, status, status_tecnico, numero_os')
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

    // ✅ REGISTRAR COMISSÃO SE A OS FOI FINALIZADA E CLIENTE NÃO RECUSOU
    // Buscar OS atualizada para verificar status final
    const { data: osAtualizada } = await supabase
      .from('ordens_servico')
      .select('status, status_tecnico, data_entrega, tecnico_id, valor_faturado, valor_servico, valor_peca, tipo, empresa_id, cliente_id')
      .eq('id', osAnterior.id)
      .single();
    
    // Usar a mesma função normalizeStatus já definida acima
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
            .select('id, tipo_comissao, comissao_fixa, comissao_percentual, empresa_id, nivel, nome, auth_user_id')
            .eq('id', tecnicoIdParaBuscar)
            .maybeSingle();
          
          // Se não encontrou pelo id, tentar buscar pelo auth_user_id
          if (!tecnicoData && !tecnicoError) {
            console.log('⚠️ Não encontrado pelo id, tentando buscar pelo auth_user_id...');
            const { data: tecnicoPorAuth, error: erroAuth } = await supabase
              .from('usuarios')
              .select('id, tipo_comissao, comissao_fixa, comissao_percentual, empresa_id, nivel, nome, auth_user_id')
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
              empresa_id: tecnicoData.empresa_id 
            });
          } else {
            // Se não encontrou, assumir que existe (já que é obrigatório) e usar valores padrão
            console.warn('⚠️ Técnico não retornado pela query, mas assumindo que existe (é obrigatório na OS)');
            console.log('📊 Usando configuração padrão da empresa para calcular comissão');
          }
          
          // Se não encontrou técnico, buscar configuração padrão da empresa diretamente
          let empresaIdParaConfig = tecnicoData?.empresa_id || osAtualizada.empresa_id || osAnterior.empresa_id;
          
          if (!tecnicoData && empresaIdParaConfig) {
            console.log('⚠️ Técnico não encontrado, usando configuração padrão da empresa:', empresaIdParaConfig);
          }
          
          // Buscar configuração padrão
          const { data: configData } = await supabase
            .from('configuracoes_comissao')
            .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao')
            .eq('empresa_id', empresaIdParaConfig)
            .maybeSingle();
          
          // Determinar tipo e valor
          let tipoComissao: 'porcentagem' | 'fixo' = 'porcentagem';
          let valorComissao = 0;
          
          if (tecnicoData?.tipo_comissao) {
            tipoComissao = tecnicoData.tipo_comissao as 'porcentagem' | 'fixo';
            if (tipoComissao === 'fixo') {
              valorComissao = tecnicoData.comissao_fixa || 0;
            } else {
              valorComissao = tecnicoData.comissao_percentual || 0;
            }
            console.log('📊 Usando configuração individual do técnico:', { tipoComissao, valorComissao });
          } else if (configData?.tipo_comissao) {
            tipoComissao = configData.tipo_comissao as 'porcentagem' | 'fixo';
            if (tipoComissao === 'fixo') {
              valorComissao = configData.comissao_fixa_padrao || 0;
            } else {
              valorComissao = configData.comissao_padrao || 0;
            }
            console.log('📊 Usando configuração padrão da empresa:', { tipoComissao, valorComissao });
          } else {
            valorComissao = 10; // Fallback
            console.log('📊 Usando valor padrão (fallback):', { tipoComissao, valorComissao });
          }
          
          // Usar o id real do técnico (não o auth_user_id) para inserir na comissão
          const tecnicoIdReal = tecnicoData?.id || tecnicoIdParaBuscar;
          
          if (!tecnicoData) {
            console.error('❌ NÃO É POSSÍVEL REGISTRAR COMISSÃO: Técnico não encontrado no banco de dados', {
              tecnicoIdNaOS: tecnicoIdParaBuscar,
              osId: osAnterior.id,
              numeroOS: osAnterior.numero_os,
              motivo: 'Técnico não encontrado nem pelo id nem pelo auth_user_id',
              acaoRecomendada: 'Verificar se o técnico existe na tabela usuarios'
            });
          } else {
            // Calcular valor da comissão
            let valorComissaoCalculado = 0;
            const valorFaturado = osAtualizada.valor_faturado || 0;
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
            
            // Preparar dados para inserção (usar o id real do técnico, não o auth_user_id)
            // IMPORTANTE: Se a tabela não permite NULL em percentual_comissao, usar 0 quando for fixo
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
            
            // Adicionar campos condicionais (só incluir se não forem null para evitar constraint errors)
            if (tipoComissao === 'porcentagem') {
              dadosComissao.percentual_comissao = valorComissao;
              // Não incluir valor_comissao_fixa quando for porcentagem
            } else {
              dadosComissao.valor_comissao_fixa = valorComissao;
              // Se a tabela não permite NULL em percentual_comissao, usar 0
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
        temDataEntrega: !!temDataEntrega,
        temTecnico: !!temTecnico,
        clienteRecusou: !!cliente_recusou
      });
    }

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
