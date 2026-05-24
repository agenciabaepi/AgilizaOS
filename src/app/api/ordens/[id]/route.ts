import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendOSApprovedNotification } from '@/lib/whatsapp-notifications';
import { carregarTermoPadraoEmpresa, isTermoGarantiaPadraoId } from '@/lib/termoGarantiaPadrao';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Usar service role key para bypass de autenticação (para página de impressão)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined; },
          set() {},
          remove() {},
        },
      }
    );
    
    console.log('🔍 Buscando OS com ID:', id);
    
    // Buscar a OS primeiro
    const { data: ordemData, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar OS:', error);
      return NextResponse.json({ error: 'OS não encontrada: ' + error.message }, { status: 404 });
    }

    if (!ordemData) {
      console.error('❌ OS não encontrada no banco');
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
    }

    // Buscar dados relacionados separadamente
    const [empresaResult, clienteResult, termoResult] = await Promise.allSettled([
      supabase.from('empresas').select('*').eq('id', ordemData.empresa_id).single(),
      supabase.from('clientes').select('*').eq('id', ordemData.cliente_id).single(),
      // Buscar termo de garantia com validação de empresa para segurança
      supabase.from('termos_garantia')
        .select('*')
        .eq('id', ordemData.termo_garantia_id)
        .eq('empresa_id', ordemData.empresa_id)
        .single()
    ]);

    // Buscar checklistItens se houver checklist_entrada e equipamento
    let checklistItens = null;
    if (ordemData.checklist_entrada && ordemData.equipamento) {
      console.log('🔍 Buscando checklistItens para equipamento:', ordemData.equipamento);
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklist_itens')
        .select('*')
        .eq('empresa_id', ordemData.empresa_id)
        .eq('equipamento_categoria', ordemData.equipamento);
      
      if (checklistError) {
        console.error('❌ Erro ao buscar checklistItens:', checklistError);
      } else {
        checklistItens = checklistData;
        console.log('✅ ChecklistItens encontrados:', checklistItens?.length || 0);
      }
    }

    let termoGarantia =
      termoResult.status === 'fulfilled' ? termoResult.value.data : null;
    if (
      ordemData.termo_garantia_id &&
      ordemData.empresa_id &&
      isTermoGarantiaPadraoId(ordemData.termo_garantia_id, ordemData.empresa_id)
    ) {
      termoGarantia = await carregarTermoPadraoEmpresa(supabase, ordemData.empresa_id);
    }

  // Montar objeto final com dados relacionados
    const data = {
      ...ordemData,
      empresa: empresaResult.status === 'fulfilled' ? empresaResult.value.data : null,
      cliente: clienteResult.status === 'fulfilled' ? clienteResult.value.data : null,
      termo_garantia: termoGarantia,
      checklistItens: checklistItens,
      // Usar o campo tecnico que já existe na OS
      tecnico: ordemData.tecnico || null,
    };

    console.log('✅ OS encontrada:', data.numero_os);
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('❌ Erro na API GET /api/ordens/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Parse JSON data from request body
    const updateData = await request.json();
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
    
    // Tentar obter usuário diretamente
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('API Route - Usuário não encontrado:', userError);
      return NextResponse.json({ error: 'Não autorizado - Usuário não encontrado. Faça login novamente.' }, { status: 401 });
    }

    // Buscar empresa_id do usuário
    const { data: userData, error: userDataError } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (userDataError || !userData?.empresa_id) {

      return NextResponse.json({ error: 'Empresa não encontrada para o usuário. Verifique se o usuário está vinculado a uma empresa.' }, { status: 403 });
    }

    const empresaId = userData.empresa_id;
    // Prepare data for update
    const dataToUpdate: Record<string, unknown> = {};

    // Add data if not empty
    if (updateData.servico) dataToUpdate.servico = updateData.servico;
    if (updateData.peca) dataToUpdate.peca = updateData.peca;
    if (updateData.qtd_servico > 0) dataToUpdate.qtd_servico = updateData.qtd_servico;
    if (updateData.qtd_peca > 0) dataToUpdate.qtd_peca = updateData.qtd_peca;
    if (updateData.valor_servico > 0) dataToUpdate.valor_servico = updateData.valor_servico;
    if (updateData.valor_peca > 0) dataToUpdate.valor_peca = updateData.valor_peca;
    if (updateData.status_id) dataToUpdate.status_id = updateData.status_id;
    if (updateData.tecnico_id && updateData.tecnico_id !== '') dataToUpdate.tecnico_id = updateData.tecnico_id;
    if (updateData.termo_garantia_id) dataToUpdate.termo_garantia_id = updateData.termo_garantia_id;
    
    // ✅ CAMPOS DE EQUIPAMENTO
    if (updateData.marca) dataToUpdate.marca = updateData.marca;
    if (updateData.modelo) dataToUpdate.modelo = updateData.modelo;
    if (updateData.cor) dataToUpdate.cor = updateData.cor;
    if (updateData.numero_serie) dataToUpdate.numero_serie = updateData.numero_serie;
    if (updateData.equipamento) dataToUpdate.equipamento = updateData.equipamento;
    if (updateData.acessorios) dataToUpdate.acessorios = updateData.acessorios;
    if (updateData.condicoes_equipamento) dataToUpdate.condicoes_equipamento = updateData.condicoes_equipamento;
    if (updateData.problema_relatado) dataToUpdate.problema_relatado = updateData.problema_relatado;
    if (updateData.laudo) dataToUpdate.laudo = updateData.laudo;
    if (updateData.imagens) dataToUpdate.imagens = updateData.imagens;
    if (updateData.observacao) dataToUpdate.observacao = updateData.observacao;
    if (updateData.checklist_entrada) dataToUpdate.checklist_entrada = updateData.checklist_entrada;
    
    // Lógica automática para status técnico
    if (updateData.status) {
      const normalize = (s: string) => (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      dataToUpdate.status = updateData.status;
      const st = normalize(updateData.status);
      
      if (st === 'APROVADO') {
        dataToUpdate.status_tecnico = 'APROVADO';
      } else if (st === 'ENTREGUE') {
        dataToUpdate.status_tecnico = 'FINALIZADA';
        // Se não veio data_entrega explícita, registrar agora e calcular garantia
        if (!updateData.data_entrega) {
          const hoje = new Date();
          const dataStr = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())).toISOString().slice(0,10);
          const garantia = new Date(hoje);
          garantia.setDate(garantia.getDate() + 90);
          const garantiaStr = new Date(Date.UTC(garantia.getFullYear(), garantia.getMonth(), garantia.getDate())).toISOString().slice(0,10);
          dataToUpdate.data_entrega = dataStr; // colunas tipo date
          dataToUpdate.vencimento_garantia = garantiaStr;
        }
      } else if (st === 'AGUARDANDO APROVACAO') {
        dataToUpdate.status_tecnico = 'AGUARDANDO APROVAÇÃO';
      } else if (st === 'AGUARDANDO RETIRADA') {
        dataToUpdate.status_tecnico = 'AGUARDANDO RETIRADA';
      }
    }
    
    if (updateData.status_tecnico && !dataToUpdate.status_tecnico) {
      dataToUpdate.status_tecnico = updateData.status_tecnico;
    }

    // Calculate total value
    const valor_faturado = (updateData.qtd_servico * updateData.valor_servico) + (updateData.qtd_peca * updateData.valor_peca);
    dataToUpdate.valor_faturado = valor_faturado;

    // ✅ BUSCAR STATUS ANTERIOR PARA VERIFICAR MUDANÇA PARA APROVADO
    const { data: osAnteriorStatus } = await supabase
      .from('ordens_servico')
      .select('status, status_tecnico, tecnico_id')
      .eq('id', id)
      .single();
    
    const statusAnterior = osAnteriorStatus?.status;
    const statusTecnicoAnterior = osAnteriorStatus?.status_tecnico;
    const statusNovo = dataToUpdate.status || statusAnterior;
    const statusTecnicoNovo = dataToUpdate.status_tecnico || statusTecnicoAnterior;

    // 🔍 DEBUG: Log dos dados que serão atualizados
    console.log('🔍 DEBUG API PUT - Dados que serão atualizados:');
    console.log('📋 dataToUpdate:', dataToUpdate);
    console.log('📋 updateData.equipamento:', updateData.equipamento);
    console.log('📋 dataToUpdate.equipamento:', dataToUpdate.equipamento);

    // ✅ BUSCAR EQUIPAMENTO ANTERIOR ANTES DE ATUALIZAR
    console.log('🔢 Verificando atualização do contador de equipamentos...');
    console.log('📋 Dados da atualização:', { equipamento: updateData.equipamento, empresa_id: empresaId });
    
    // Buscar o equipamento anterior da OS ANTES de atualizar
    const { data: osAnterior } = await supabase
      .from('ordens_servico')
      .select('equipamento')
      .eq('id', id)
      .single();

    const equipamentoAnterior = osAnterior?.equipamento;
    const equipamentoNovo = updateData.equipamento;

    console.log('🔍 Equipamento anterior:', equipamentoAnterior);
    console.log('🔍 Equipamento novo:', equipamentoNovo);

    // Update the order
    const { data, error } = await supabase
      .from('ordens_servico')
      .update(dataToUpdate)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select();

    if (error) {
      console.error('API Route - Erro ao atualizar ordem:', error);
      return NextResponse.json({ error: 'Erro ao atualizar ordem: ' + error.message }, { status: 500 });
    }

    // ✅ ATUALIZAR CONTADOR DE EQUIPAMENTOS (se equipamento foi alterado)
    // IMPORTANTE: Recalcular contadores APÓS atualizar a OS
    try {

      // Se o equipamento mudou, recalcular contadores baseado na quantidade real
      if (equipamentoAnterior !== equipamentoNovo) {
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
            
            await supabase
              .from('equipamentos_tipos')
              .update({ quantidade_cadastrada: quantidadeFinal })
              .eq('id', equipamentoData.id);
            
            console.log(`✅ ${nomeEquipamento} atualizado com sucesso!`);
          } else {
            console.log(`⚠️ Equipamento ${nomeEquipamento} não encontrado na tabela equipamentos_tipos`);
          }
        }
      } else {
        console.log('✅ Equipamento não alterado, contadores mantidos');
      }
    } catch (counterError) {
      console.error('❌ Erro ao atualizar contador de equipamentos:', counterError);
      // Não falha a atualização da OS se o contador falhar
    }

    // ✅ ENVIAR NOTIFICAÇÃO WHATSAPP SE STATUS MUDOU PARA APROVADO
    // Só enviar se realmente houve mudança de status (não apenas se já estava aprovado)
    try {
      const normalize = (s: string) => (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const statusNormalizado = normalize(statusNovo || '');
      const statusTecnicoNormalizado = normalize(statusTecnicoNovo || '');
      const statusAnteriorNormalizado = normalize(statusAnterior || '');
      const statusTecnicoAnteriorNormalizado = normalize(statusTecnicoAnterior || '');
      
      // Verificar se MUDOU para aprovado (não estava antes e agora está)
      const mudouParaAprovado = (
        (statusNormalizado.includes('APROVADO') || statusNormalizado.includes('APROVADA')) &&
        !statusAnteriorNormalizado.includes('APROVADO') && 
        !statusAnteriorNormalizado.includes('APROVADA')
      ) || (
        (statusTecnicoNormalizado.includes('APROVADO') || statusTecnicoNormalizado.includes('APROVADA')) &&
        !statusTecnicoAnteriorNormalizado.includes('APROVADO') && 
        !statusTecnicoAnteriorNormalizado.includes('APROVADA')
      );
      
      if (mudouParaAprovado) {
        console.log('🎉 Status MUDOU para APROVADO - enviando notificação WhatsApp para o técnico');
        console.log('📊 Mudança detectada:', { 
          statusAnterior, 
          statusNovo,
          statusTecnicoAnterior,
          statusTecnicoNovo
        });
        
        // Enviar notificação de aprovação
        const notificationSuccess = await sendOSApprovedNotification(id);
        
        if (notificationSuccess) {
          console.log('✅ Notificação WhatsApp de OS aprovada enviada com sucesso');
        } else {
          console.warn('⚠️ Falha ao enviar notificação WhatsApp de OS aprovada');
        }
      } else {
        console.log('ℹ️ Status não mudou para aprovado ou já estava aprovado - não enviando notificação');
      }
    } catch (notificationError) {
      console.error('❌ Erro ao enviar notificação WhatsApp:', notificationError);
      // Não falha a atualização por causa da notificação
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('API Route - Erro na API PUT /api/ordens/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}