import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { sendOSApprovedNotification, sendOSStatusNotification } from '@/lib/whatsapp-notifications';
import { sendPushToTecnico, buildNovaOSPushMessage } from '@/lib/push-notification-tecnico';

// Função auxiliar para normalizar status
function normalizeStatus(status: string): string {
  if (!status) return '';
  return status.trim().toUpperCase();
}

function isStatusTecnicoFinal(status: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized === 'REPARO CONCLUÍDO' || normalized === 'REPARO CONCLUIDO';
}

function isStatusSemReparo(status: string): boolean {
  const normalized = normalizeStatus(status)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized === 'SEM REPARO' || normalized === 'SEMREPARO';
}

/** Mapeia status do técnico para status da O.S. (espelhamento técnico → atendente) */
function mapTecnicoParaOS(statusTec: string): string {
  const n = (normalizeStatus(statusTec) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ');
  if (/AGUARDANDO\s*INICIO/.test(n)) return 'ORÇAMENTO';
  if (/EM\s*ANALISE|EM_ANALISE/.test(n)) return 'EM_ANALISE';
  if (/ORCAMENTO\s*CONCLUIDO/.test(n)) return 'ORÇAMENTO CONCLUÍDO';
  if (/AGUARDANDO\s*PECA|AGUARDANDO_PECA/.test(n)) return 'AGUARDANDO PEÇA';
  if (/EM\s*EXECUCAO|EM_EXECUCAO/.test(n)) return 'APROVADO';
  if (/REPARO\s*CONCLUIDO|CONCLUIDO/.test(n)) return 'CONCLUIDO';
  if (/SEM\s*REPARO|SEM_REPARO/.test(n)) return 'SEM REPARO';
  if (/APROVADO|AGUARDANDO\s*APROVACAO|AGUARDANDO\s*RETIRADA|CLIENTE\s*RECUSOU/.test(n)) return (statusTec || '').trim();
  return (statusTec || '').trim() || '';
}

/** Mapeia status da O.S. para status do técnico (espelhamento atendente → técnico) */
function mapOSTecnico(statusOS: string): string {
  const n = (normalizeStatus(statusOS) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ');
  if (/(^| )ORCAMENTO($| )/.test(n) && !/CONCLUIDO/.test(n)) return 'AGUARDANDO INÍCIO';
  if (/EM\s*ANALISE|EM_ANALISE/.test(n)) return 'EM ANÁLISE';
  if (/ORCAMENTO\s*CONCLUIDO/.test(n)) return 'ORÇAMENTO CONCLUÍDO';
  if (/AGUARDANDO\s*PECA|AGUARDANDO_PECA/.test(n)) return 'AGUARDANDO PEÇA';
  if (/APROVADO|EM\s*EXECUCAO/.test(n)) return 'APROVADO';
  if (/CONCLUIDO|REPARO/.test(n) && !/SEM/.test(n)) return 'REPARO CONCLUÍDO';
  if (/SEM\s*REPARO|SEM_REPARO/.test(n)) return 'SEM REPARO';
  if (/ENTREGUE/.test(n)) return 'REPARO CONCLUÍDO';
  if (/AGUARDANDO\s*APROVACAO|AGUARDANDO\s*RETIRADA|CLIENTE\s*RECUSOU/.test(n)) return (statusOS || '').trim();
  return (statusOS || '').trim() || '';
}

function extractStatusText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null && 'nome' in value) {
    const nome = (value as { nome?: unknown }).nome;
    return typeof nome === 'string' ? nome.trim() : '';
  }
  return String(value).trim();
}

function extractMissingColumn(message: string): string | null {
  if (!message) return null;
  const match = message.match(/column\s+[^\s.]+\.(\w+)\s+does not exist/i);
  return match?.[1] || null;
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

// Função auxiliar para comparar valores numéricos (especialmente dinheiro) de forma robusta
function parseNumeroBrasil(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') {
    return Number.isNaN(valor) ? null : valor;
  }
  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    if (!trimmed) return 0;
    const normalizado = trimmed.replace(/\./g, '').replace(',', '.');
    const n = Number(normalizado);
    return Number.isNaN(n) ? null : n;
  }
  return null;
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
      aparelho_sem_conserto,
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
          'condicoes_equipamento',
          'videos_tecnico'
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
    // Tipamos como "any" aqui porque o select é dinâmico e montado por string.
    const { data: osAnterior, error: buscaError } = await query.single<any>();

    if (buscaError || !osAnterior) {
      console.error('❌ Erro ao buscar OS:', buscaError);
      return NextResponse.json(
        { error: 'OS não encontrada' },
        { status: 404 }
      );
    }

    // Regra final: OS entregue não pode mais ser alterada
    if (normalizeStatus(String((osAnterior as any).status || '')) === 'ENTREGUE') {
      return NextResponse.json(
        { error: 'Esta O.S. já foi entregue e está bloqueada para edição.' },
        { status: 409 }
      );
    }

    // Excluir do Supabase Storage os vídeos que foram removidos
    const oldVideos = String((osAnterior as any).videos_tecnico || '').split(',').map((u: string) => u.trim()).filter(Boolean);
    const newVideos = String(updateData.videos_tecnico ?? '').split(',').map((u: string) => u.trim()).filter(Boolean);
    const removedVideoUrls = oldVideos.filter((url: string) => !newVideos.includes(url));
    if (removedVideoUrls.length > 0) {
      try {
        const BUCKET = 'ordens-imagens';
        for (const url of removedVideoUrls) {
          try {
            const decoded = decodeURIComponent(url);
            const idx = decoded.indexOf(`${BUCKET}/`);
            if (idx !== -1) {
              const path = decoded.slice(idx + BUCKET.length + 1).split('?')[0].trim().replace(/^\/+|\/+$/g, '');
              if (path) {
                await supabase.storage.from(BUCKET).remove([path]);
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // Normalizar status para comparação
    const statusNormalizado = normalizeStatus(newStatus || '');
    const statusTecnicoNormalizado = normalizeStatus(newStatusTecnico || '');
    const seraFinalizada = statusNormalizado === 'ENTREGUE' || isStatusTecnicoFinal(statusTecnicoNormalizado);
    
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

    // ========== ESPELHAMENTO BIDIRECIONAL ==========
    // Regra: técnico seleciona status → espelha na O.S. | atendente seleciona status → espelha no técnico
    // Exceção: SEM REPARO do técnico fica FIXO (mesmo ao entregar, não vira REPARO CONCLUÍDO)
    const osAnteriorStatus = extractStatusText((osAnterior as any).status);
    const osAnteriorStatusTecnico = extractStatusText((osAnterior as any).status_tecnico);
    const novoStatusRaw = body.newStatus !== undefined ? String(body.newStatus).trim() : (newStatus ? String(newStatus).trim() : '');
    const novoStatusTecnicoRaw = body.newStatusTecnico !== undefined ? String(body.newStatusTecnico).trim() : (newStatusTecnico ? String(newStatusTecnico).trim() : '');

    const tecnicoAlterou = !!novoStatusTecnicoRaw && novoStatusTecnicoRaw !== osAnteriorStatusTecnico;
    const atendenteAlterou = !!novoStatusRaw && novoStatusRaw !== osAnteriorStatus;

    // Técnico alterou → espelhar para O.S.
    if (tecnicoAlterou) {
      dadosAtualizacao.status_tecnico = novoStatusTecnicoRaw;
      dadosAtualizacao.status = mapTecnicoParaOS(novoStatusTecnicoRaw) || novoStatusRaw || osAnteriorStatus;
    }
    // Atendente alterou → espelhar para técnico (exceto se técnico tinha SEM REPARO)
    else if (atendenteAlterou) {
      dadosAtualizacao.status = novoStatusRaw;
      if (isStatusSemReparo(osAnteriorStatusTecnico)) {
        dadosAtualizacao.status_tecnico = 'SEM REPARO'; // FIXO: não sobrescreve
      } else {
        dadosAtualizacao.status_tecnico = mapOSTecnico(novoStatusRaw) || novoStatusTecnicoRaw || osAnteriorStatusTecnico;
      }
    }
    // Apenas updateData (ex.: bancada com outros campos) – aplicar espelhamento do que veio
    else if (novoStatusTecnicoRaw) {
      dadosAtualizacao.status_tecnico = novoStatusTecnicoRaw;
      dadosAtualizacao.status = mapTecnicoParaOS(novoStatusTecnicoRaw) || dadosAtualizacao.status || osAnteriorStatus;
    } else if (novoStatusRaw) {
      dadosAtualizacao.status = novoStatusRaw;
      dadosAtualizacao.status_tecnico = isStatusSemReparo(osAnteriorStatusTecnico) ? 'SEM REPARO' : (mapOSTecnico(novoStatusRaw) || osAnteriorStatusTecnico);
    }

    // Entrega explícita: newStatus ENTREGUE deve prevalecer sobre o espelhamento técnico → OS.
    // Caso contrário, se técnico e OS mudam no mesmo POST (ex.: modal de entrega com REPARO CONCLUÍDO),
    // o ramo `tecnicoAlterou` usa mapTecnicoParaOS → CONCLUIDO e ignora ENTREGUE.
    if (normalizeStatus(novoStatusRaw) === 'ENTREGUE') {
      dadosAtualizacao.status = 'ENTREGUE';
      if (isStatusSemReparo(osAnteriorStatusTecnico)) {
        dadosAtualizacao.status_tecnico = 'SEM REPARO';
      } else {
        dadosAtualizacao.status_tecnico =
          novoStatusTecnicoRaw || mapOSTecnico('ENTREGUE') || osAnteriorStatusTecnico;
      }
    }

    // Exceção SEM REPARO: ao entregar (ENTREGUE), status_tecnico permanece SEM REPARO se já era
    const statusFinal = normalizeStatus(String(dadosAtualizacao.status || ''));
    if (statusFinal === 'ENTREGUE' && isStatusSemReparo(osAnteriorStatusTecnico)) {
      dadosAtualizacao.status_tecnico = 'SEM REPARO';
    }
    // Persistir cliente_recusou para que essa OS não entre em comissões (gerar-pendentes, listas)
    if (cliente_recusou === true) {
      dadosAtualizacao.cliente_recusou = true;
    }

    // Atualizar a OS usando o ID UUID (com fallback para colunas opcionais ausentes)
    let payloadAtualizacao: Record<string, any> = { ...dadosAtualizacao };

    let ordemAtualizada: any = null;
    let updateError: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const result = await supabase
        .from('ordens_servico')
        .update(payloadAtualizacao)
        .eq('id', osAnterior.id)
        .select()
        .single();
      ordemAtualizada = result.data;
      updateError = result.error;
      if (!updateError) break;

      const missingColumn = extractMissingColumn(String(updateError.message || ''));
      if (!missingColumn || !(missingColumn in payloadAtualizacao)) break;

      console.warn(`⚠️ Coluna opcional ausente (${missingColumn}) em ordens_servico. Repetindo atualização sem este campo.`);
      const { [missingColumn]: _ignored, ...rest } = payloadAtualizacao;
      payloadAtualizacao = rest;
    }

    if (updateError) {
      console.error('❌ Erro ao atualizar OS:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar OS: ' + updateError.message },
        { status: 500 }
      );
    }

    // Garantia: se status_tecnico é SEM REPARO e status não é ENTREGUE, espelhar SEM REPARO na OS
    const statusTecnicoPersistido = extractStatusText(ordemAtualizada?.status_tecnico);
    const statusOSPersistido = (normalizeStatus(extractStatusText(ordemAtualizada?.status)) || '').replace(/_/g, ' ').trim();
    if (isStatusSemReparo(statusTecnicoPersistido) && statusOSPersistido !== 'SEM REPARO' && statusOSPersistido !== 'ENTREGUE') {
      const { data: corrigida } = await supabase
        .from('ordens_servico')
        .update({ status: 'SEM REPARO', updated_at: new Date().toISOString() })
        .eq('id', osAnterior.id)
        .select()
        .single();
      if (corrigida) ordemAtualizada = corrigida;
    }

    // Enviar push ao técnico quando ele é atribuído ou alterado na O.S.
    const novoTecnicoId = ordemAtualizada?.tecnico_id ?? null;
    const tecnicoAnteriorId = (osAnterior as any)?.tecnico_id ?? null;
    if (novoTecnicoId && novoTecnicoId !== tecnicoAnteriorId) {
      try {
        const osParaMensagem = { ...(osAnterior as any), ...ordemAtualizada };
        const { title, body } = buildNovaOSPushMessage(osParaMensagem);
        const { sent } = await sendPushToTecnico(supabase, novoTecnicoId, {
          title,
          body,
          data: { os_id: osAnterior.id },
        });
        if (sent > 0) {
          console.log('✅ Push enviada ao técnico (atribuição/alteracao), O.S.', osAnterior.id, 'dispositivos:', sent);
        }
      } catch (pushError) {
        console.warn('⚠️ Erro ao enviar push ao técnico (não crítico):', pushError);
      }
    }

    // Registrar histórico de mudança de status em tabela dedicada, se houver mudança
    const statusNovoParaHistorico = dadosAtualizacao.status ?? osAnterior.status;
    const statusTecnicoNovoParaHistorico = dadosAtualizacao.status_tecnico ?? osAnterior.status_tecnico;
    const statusMudou = (osAnterior.status !== statusNovoParaHistorico) || (String(osAnterior.status_tecnico || '') !== String(statusTecnicoNovoParaHistorico || ''));
    if (statusMudou) {
      try {
        const { error: historicoError } = await supabase
          .from('status_historico')
          .insert({
            os_id: osAnterior.id,
            status_anterior: osAnterior.status,
            status_novo: statusNovoParaHistorico,
            status_tecnico_anterior: osAnterior.status_tecnico,
            status_tecnico_novo: statusTecnicoNovoParaHistorico,
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

    // ✅ REGISTRAR COMISSÃO SE A OS FOI CONCLUÍDA E CLIENTE NÃO RECUSOU
    let comissaoRegistrada = false;
    let comissaoErro: string | null = null;
    // Buscar OS atualizada para verificar status final
    const { data: osAtualizada } = await supabase
      .from('ordens_servico')
      .select('status, status_tecnico, data_entrega, tecnico_id, valor_faturado, valor_servico, valor_peca, tipo, empresa_id, cliente_id')
      .eq('id', osAnterior.id)
      .single();
    
    const statusAtual = normalizeStatus(osAtualizada?.status || '');
    const statusTecnicoAtual = normalizeStatus(osAtualizada?.status_tecnico || '');
    const foiFinalizada = statusAtual === 'ENTREGUE' || isStatusTecnicoFinal(statusTecnicoAtual);
    const temDataEntrega = osAtualizada?.data_entrega;
    const temTecnico = osAtualizada?.tecnico_id || osAnterior.tecnico_id;
    
    console.log('🔍 VERIFICAÇÃO DE COMISSÃO:', {
      foiFinalizada,
      temDataEntrega: !!temDataEntrega,
      temTecnico: !!temTecnico,
      clienteRecusou: !!cliente_recusou,
      aparelhoSemConserto: !!aparelho_sem_conserto,
      statusAtual,
      statusTecnicoAtual,
      dataEntrega: temDataEntrega,
      tecnicoId: temTecnico,
      osId: osAnterior.id
    });
    
    // Não registrar comissão se cliente recusou o serviço ou aparelho não teve conserto
    if (foiFinalizada && temDataEntrega && temTecnico && !cliente_recusou && !aparelho_sem_conserto) {
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
          // Notificar só se a OS acabou de ser finalizada nesta requisição (evita duplicata ao reabrir/editar)
          const statusEraFinalAntes = normalizeStatus(String((osAnterior as any).status || '')) === 'ENTREGUE' ||
            isStatusTecnicoFinal(String((osAnterior as any).status_tecnico || ''));
          if (!statusEraFinalAntes) {
            const tecnicoIdNotif = osAtualizada?.tecnico_id || (osAnterior as any)?.tecnico_id;
            if (tecnicoIdNotif) {
              try {
                const numeroOs = osAtualizada?.numero_os ?? (osAnterior as any)?.numero_os ?? osAnterior?.id ?? '';
                const { sent } = await sendPushToTecnico(supabase, tecnicoIdNotif, {
                  title: `✅ O.S. #${numeroOs} entregue e faturada`,
                  body: 'Sua comissão já foi calculada 🤑💰',
                  data: { os_id: osAnterior.id },
                });
                if (sent > 0) console.log('✅ Push "entregue e faturada" enviada (comissão já existia), O.S.', osAnterior.id);
              } catch (e) {
                console.warn('⚠️ Erro push comissão (comissão existente):', e);
              }
            }
          }
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
            
            // Calcular valor da comissão (usar valor_servico se valor_faturado for 0)
            const valorFaturado = osAtualizada.valor_faturado ?? 0;
            const valorServico = osAtualizada.valor_servico ?? 0;
            const valorBase = valorFaturado > 0 ? valorFaturado : valorServico;
            let valorComissaoCalculado = 0;
            if (tipoComissao === 'fixo') {
              valorComissaoCalculado = valorComissao;
            } else {
              valorComissaoCalculado = valorBase * valorComissao / 100;
            }
            
            console.log('💰 CÁLCULO DA COMISSÃO:', {
              tipoComissao,
              valorComissao,
              valorFaturado,
              valorServico,
              valorBase,
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
              valor_servico: valorServico,
              valor_peca: osAtualizada.valor_peca ?? 0,
              valor_total: valorBase,
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
              comissaoErro = comissaoError.message || 'Erro ao inserir comissão no banco';
              console.error('❌ ERRO AO REGISTRAR COMISSÃO:', {
                error: comissaoError,
                message: comissaoError.message,
                code: comissaoError.code,
                details: comissaoError.details,
                hint: comissaoError.hint
              });
            } else {
              comissaoRegistrada = true;
              console.log('✅✅✅ COMISSÃO REGISTRADA COM SUCESSO!', {
                id: comissaoInserida?.[0]?.id,
                valor: valorComissaoCalculado,
                tipo: tipoComissao
              });
              // Notificar técnico: O.S. entregue e faturada, comissão calculada
              try {
                const numeroOs = osAtualizada?.numero_os ?? osAnterior?.numero_os ?? osAnterior?.id ?? '';
                const { sent } = await sendPushToTecnico(supabase, tecnicoIdParaBuscar, {
                  title: `✅ O.S. #${numeroOs} entregue e faturada`,
                  body: 'Sua comissão já foi calculada 🤑💰',
                  data: { os_id: osAnterior.id },
                });
                if (sent > 0) {
                  console.log('✅ Push "entregue e faturada" enviada ao técnico, O.S.', osAnterior.id);
                }
              } catch (pushError) {
                console.warn('⚠️ Erro ao enviar push de comissão ao técnico (não crítico):', pushError);
              }
            }
          }
        }
      } catch (comissaoErr: any) {
        comissaoErro = comissaoErr?.message || 'Erro ao processar comissão';
        console.error('❌ ERRO GERAL AO PROCESSAR COMISSÃO:', comissaoErr);
        // Não falha a atualização da OS por causa da comissão
      }
    } else {
      console.log('⏭️ COMISSÃO NÃO SERÁ REGISTRADA:', {
        motivo: cliente_recusou ? 'Cliente recusou o serviço' : aparelho_sem_conserto ? 'Aparelho sem conserto' : !foiFinalizada ? 'OS não finalizada' : !temDataEntrega ? 'Sem data de entrega' : !temTecnico ? 'Sem técnico' : 'Desconhecido',
        foiFinalizada,
        temDataEntrega,
        temTecnico,
        clienteRecusou: cliente_recusou,
        aparelhoSemConserto: aparelho_sem_conserto
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

          // Para campos monetários, comparar pelo valor numérico (ignorando formatação "100,00" vs "100")
          const isCampoMonetario =
            campo === 'valor_faturado' ||
            campo === 'valor_servico' ||
            campo === 'valor_peca';

          if (isCampoMonetario) {
            const numAnterior = parseNumeroBrasil(valorAnterior);
            const numNovo = parseNumeroBrasil(valorNovo);

            if (numAnterior !== null && numNovo !== null) {
              const diff = Math.abs(numAnterior - numNovo);
              if (diff < 0.000001) {
                // Mesma quantidade em reais (apenas formatação diferente) → não registrar alteração
                continue;
              }
            }
          } else {
            // Comparação genérica para outros campos, tratando null/undefined igual
            const anteriorNorm = valorAnterior ?? null;
            const novoNorm = valorNovo ?? null;

            if (JSON.stringify(anteriorNorm) === JSON.stringify(novoNorm)) {
              continue;
            }
          }

          alteracoes.push({ campo, valorAnterior, valorNovo });
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
      message: 'OS atualizada com sucesso',
      comissaoRegistrada: comissaoRegistrada || undefined,
      comissaoErro: comissaoErro || undefined
    });

  } catch (error: any) {
    console.error('❌ Erro interno ao atualizar OS:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error.message || 'Erro desconhecido') },
      { status: 500 }
    );
  }
}
