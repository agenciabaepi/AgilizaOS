import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { sendPushToTecnico } from '@/lib/push-notification-tecnico';

function normalizeStatus(s: string | null | undefined): string {
  if (!s) return '';
  return s.trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function isFinalizada(status: string, statusTecnico: string): boolean {
  const st = normalizeStatus(status);
  const stt = normalizeStatus(statusTecnico);
  return st === 'ENTREGUE' || stt === 'REPARO CONCLUÍDO' || stt === 'REPARO CONCLUIDO';
}

function isClienteRecusou(status: string, statusTecnico: string, clienteRecusou: boolean): boolean {
  if (clienteRecusou === true) return true;
  const st = normalizeStatus(status);
  const stt = normalizeStatus(statusTecnico);
  return st === 'CLIENTE RECUSOU' || stt === 'CLIENTE RECUSOU';
}

/**
 * POST /api/comissoes/gerar-pendentes
 * Busca OS finalizadas que ainda não têm comissão e gera os registros faltantes.
 * Body: { empresa_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const empresa_id = body.empresa_id;

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1) Buscar OS finalizadas (ENTREGUE ou Reparo Concluído) com técnico e data_entrega; excluir "cliente recusou"
    const { data: ordens, error: ordensError } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, status, status_tecnico, data_entrega, tecnico_id, cliente_id, valor_faturado, valor_servico, valor_peca, tipo, empresa_id, cliente_recusou')
      .eq('empresa_id', empresa_id)
      .not('tecnico_id', 'is', null)
      .not('data_entrega', 'is', null);

    if (ordensError) {
      return NextResponse.json(
        { error: 'Erro ao buscar ordens: ' + ordensError.message },
        { status: 500 }
      );
    }

    const osFinalizadas = (ordens || []).filter((os: any) => {
      if (!isFinalizada(os.status || '', os.status_tecnico || '')) return false;
      if (isClienteRecusou(os.status || '', os.status_tecnico || '', !!os.cliente_recusou)) return false;
      return true;
    });

    // 2) IDs das OS que já têm comissão
    const { data: comissoesExistentes } = await supabase
      .from('comissoes_historico')
      .select('ordem_servico_id')
      .eq('empresa_id', empresa_id);

    const osComComissao = new Set((comissoesExistentes || []).map((c: any) => c.ordem_servico_id));
    const osPendentes = osFinalizadas.filter((os: any) => !osComComissao.has(os.id));

    if (osPendentes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma comissão pendente para gerar.',
        geradas: 0,
        erros: []
      });
    }

    // 3) Configuração padrão da empresa
    const { data: configEmpresa } = await supabase
      .from('configuracoes_comissao')
      .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao')
      .eq('empresa_id', empresa_id)
      .maybeSingle();

    let geradas = 0;
    const erros: string[] = [];

    for (const os of osPendentes) {
      const tecnicoIdOs = os.tecnico_id;

      // Resolver técnico: id da tabela usuarios (pode vir como id ou auth_user_id na OS)
      let { data: tecnicoData } = await supabase
        .from('usuarios')
        .select('id, nome, nivel, tipo_comissao, comissao_fixa, comissao_percentual, empresa_id, comissao_ativa')
        .eq('id', tecnicoIdOs)
        .maybeSingle();

      if (!tecnicoData) {
        const { data: porAuth } = await supabase
          .from('usuarios')
          .select('id, nome, nivel, tipo_comissao, comissao_fixa, comissao_percentual, empresa_id, comissao_ativa')
          .eq('auth_user_id', tecnicoIdOs)
          .maybeSingle();
        tecnicoData = porAuth || null;
      }

      if (!tecnicoData || tecnicoData.nivel !== 'tecnico' || tecnicoData.comissao_ativa === false) {
        erros.push(`OS #${os.numero_os}: técnico não encontrado ou sem comissão ativa`);
        continue;
      }

      let tipoComissao = 'porcentagem';
      let valorComissao = 10;
      if (tecnicoData.tipo_comissao) {
        tipoComissao = tecnicoData.tipo_comissao;
        if (tipoComissao === 'fixo') valorComissao = tecnicoData.comissao_fixa ?? 0;
        else valorComissao = tecnicoData.comissao_percentual ?? 10;
      } else if (configEmpresa?.tipo_comissao) {
        tipoComissao = configEmpresa.tipo_comissao;
        if (tipoComissao === 'fixo') valorComissao = configEmpresa.comissao_fixa_padrao ?? 0;
        else valorComissao = configEmpresa.comissao_padrao ?? 10;
      }

      const valorFaturado = os.valor_faturado ?? 0;
      const valorServico = os.valor_servico ?? 0;
      const valorBase = valorFaturado > 0 ? valorFaturado : valorServico;
      let valorComissaoCalculado = 0;
      if (tipoComissao === 'fixo') {
        valorComissaoCalculado = valorComissao;
      } else {
        valorComissaoCalculado = (valorBase * valorComissao) / 100;
      }

      const dadosComissao: any = {
        tecnico_id: tecnicoData.id,
        ordem_servico_id: os.id,
        empresa_id: os.empresa_id,
        cliente_id: os.cliente_id,
        valor_servico: valorServico,
        valor_peca: os.valor_peca ?? 0,
        valor_total: valorBase,
        tipo_comissao: tipoComissao,
        valor_comissao: valorComissaoCalculado,
        data_entrega: os.data_entrega,
        data_calculo: new Date().toISOString(),
        status: 'CALCULADA',
        tipo_ordem: (os.tipo || 'normal').toLowerCase(),
        observacoes: 'Gerado a partir de comissões pendentes (vendas/OS finalizadas)'
      };
      if (tipoComissao === 'porcentagem') {
        dadosComissao.percentual_comissao = valorComissao;
      } else {
        dadosComissao.valor_comissao_fixa = valorComissao;
        dadosComissao.percentual_comissao = 0;
      }

      const { error: insertError } = await supabase
        .from('comissoes_historico')
        .insert(dadosComissao);

      if (insertError) {
        erros.push(`OS #${os.numero_os}: ${insertError.message}`);
        continue;
      }
      geradas++;

      // Notificar técnico: O.S. entregue e faturada, comissão calculada
      try {
        const { sent } = await sendPushToTecnico(supabase, tecnicoIdOs, {
          title: `✅ O.S. #${os.numero_os} entregue e faturada`,
          body: 'Sua comissão já foi calculada 🤑💰',
          data: { os_id: os.id },
        });
        if (sent > 0) console.log('✅ Push "entregue e faturada" enviada (gerar-pendentes), O.S.', os.id);
      } catch (pushErr) {
        console.warn('⚠️ Erro push comissão (gerar-pendentes):', pushErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: geradas > 0 ? `${geradas} comissão(ões) gerada(s).` : 'Nenhuma comissão pôde ser gerada.',
      geradas,
      totalPendentes: osPendentes.length,
      erros: erros.length ? erros : undefined
    });
  } catch (error: any) {
    console.error('Erro ao gerar comissões pendentes:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar comissões pendentes' },
      { status: 500 }
    );
  }
}
