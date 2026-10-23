import { after, NextResponse } from 'next/server';
import { getAuthUserIdFromRequest } from '@/lib/supabase/authFromRequest';
import { createAdminClient } from '@/lib/supabaseClient';
import { deveBloquearComissaoRetornoGarantia, deveExcluirComissaoOs } from '@/lib/comissaoRetornoGarantia';
import {
  fetchComissoesHistoricoRows,
  fetchOrdensPrevistasRows,
  osRowFromComissao,
} from '@/lib/comissoesQueryCompat';
import { assertEmpresaTemRecurso } from '@/lib/billing/assertPlanResource';
import { calcularValorComissao, resolverValoresBaseComissao } from '@/lib/calcularComissao';
import { gerarComissoesPendentesEmpresa } from '@/lib/gerarComissoesPendentes';

/**
 * GET /api/comissoes/tecnicos/[id]
 * Retorna comissões reais + previstas do técnico (mesma lógica que /api/comissoes/minhas).
 * Materialização de pendentes roda em background para não travar o detalhe.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tecnicoId } = await params;
    if (!tecnicoId) {
      return NextResponse.json({ error: 'ID do técnico é obrigatório' }, { status: 400 });
    }

    const authUserId = await getAuthUserIdFromRequest(request);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: quemPediu, error: userError } = await supabase
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (userError || !quemPediu?.empresa_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    const empresaId = quemPediu.empresa_id;

    const planGate = await assertEmpresaTemRecurso(empresaId, 'lucro_desempenho');
    if (!planGate.ok) return planGate.response;

    after(() => {
      void gerarComissoesPendentesEmpresa(empresaId, { notificarPush: false }).catch((e) => {
        console.warn('Aviso ao materializar comissões pendentes:', e);
      });
    });

    const { data: tecnico, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('id, nome, empresa_id, auth_user_id, tipo_comissao, comissao_fixa, comissao_percentual')
      .eq('id', tecnicoId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (tecnicoError || !tecnico) {
      return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
    }

    const tecnicoTabelaId = tecnico.id;
    const authUserIdTecnico = tecnico.auth_user_id;

    const desde = new Date();
    desde.setMonth(desde.getMonth() - 18);
    const desdeIso = desde.toISOString();

    const orFilter =
      authUserIdTecnico && authUserIdTecnico !== tecnicoTabelaId
        ? `tecnico_id.eq.${tecnicoTabelaId},tecnico_id.eq.${authUserIdTecnico}`
        : `tecnico_id.eq.${tecnicoTabelaId}`;

    const [rawComissoes, configResult, ordensResult] = await Promise.all([
      fetchComissoesHistoricoRows((osJoinFields, includeAtiva) => {
        let query = supabase
          .from('comissoes_historico')
          .select(`
          id,
          ordem_servico_id,
          valor_servico,
          valor_peca,
          valor_total,
          tipo_comissao,
          percentual_comissao,
          valor_comissao_fixa,
          valor_comissao,
          data_entrega,
          data_pagamento,
          data_calculo,
          status,
          tipo_ordem,
          created_at,
          ${includeAtiva ? 'ativa,' : ''}
          observacoes,
          ordens_servico:ordem_servico_id ( ${osJoinFields} ),
          clientes:cliente_id ( nome )
        `)
          .eq('empresa_id', empresaId)
          .order('data_entrega', { ascending: false })
          .order('created_at', { ascending: false });

        if (authUserIdTecnico && authUserIdTecnico !== tecnicoTabelaId) {
          query = query.or(`tecnico_id.eq.${tecnicoTabelaId},tecnico_id.eq.${authUserIdTecnico}`);
        } else {
          query = query.eq('tecnico_id', tecnicoTabelaId);
        }
        return query;
      }),
      supabase
        .from('configuracoes_comissao')
        .select('comissao_retorno_ativo, tipo_comissao, comissao_fixa_padrao, comissao_padrao, comissao_apenas_servico')
        .eq('empresa_id', empresaId)
        .maybeSingle(),
      fetchOrdensPrevistasRows((selectFields) =>
        supabase
          .from('ordens_servico')
          .select(selectFields)
          .eq('empresa_id', empresaId)
          .or(orFilter)
          .not('tecnico_id', 'is', null)
          .gte('created_at', desdeIso)
          .order('created_at', { ascending: false })
      ),
    ]);

    const configEmpresaRow = configResult.data;
    const { data: ordensData, error: ordensError } = ordensResult;

    const comissoesFormatadas = rawComissoes.map((c: any) => {
      const os = osRowFromComissao(c);
      return {
        id: c.id,
        ordem_servico_id: c.ordem_servico_id,
        numero_os: os?.numero_os || 'N/A',
        valor_servico: c.valor_servico || 0,
        valor_peca: c.valor_peca || 0,
        valor_total: c.valor_total || 0,
        tipo_comissao: c.tipo_comissao,
        percentual_comissao: c.percentual_comissao,
        valor_comissao_fixa: c.valor_comissao_fixa,
        valor_comissao: c.valor_comissao || 0,
        data_entrega: c.data_entrega,
        data_pagamento: c.data_pagamento || null,
        data_calculo: c.data_calculo || null,
        status: c.status || 'CALCULADA',
        tipo_ordem: c.tipo_ordem || 'normal',
        created_at: c.created_at,
        cliente_nome: c.clientes?.nome || 'Cliente não encontrado',
        servico_nome: os?.servico || 'Serviço não especificado',
        ativa: c.ativa !== undefined ? c.ativa : true,
        observacoes: c.observacoes || null,
        status_os: os?.status || null,
        status_tecnico_os: os?.status_tecnico || null,
        aparelho_sem_conserto_os: os?.aparelho_sem_conserto ?? null,
        cliente_recusou_os: os?.cliente_recusou ?? null,
      };
    });

    const norm = (s: string | null | undefined) =>
      (s || '').trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const isFinalizada = (status: string | null | undefined, statusTec: string | null | undefined) => {
      const s = norm(status);
      const t = norm(statusTec || '');
      return (
        s === 'ENTREGUE' ||
        t === 'REPARO CONCLUÍDO' ||
        t === 'REPARO CONCLUIDO' ||
        t.includes('ENTREGUE') ||
        t.includes('REPARO CONCLUIDO')
      );
    };
    const comissoesFormatadasFiltradas = comissoesFormatadas.filter(
      (c: any) =>
        !deveExcluirComissaoOs({
          cliente_recusou: c.cliente_recusou_os,
          aparelho_sem_conserto: c.aparelho_sem_conserto_os,
          status: c.status_os,
          status_tecnico: c.status_tecnico_os,
        })
    );

    const osComComissao = new Set(
      comissoesFormatadasFiltradas.map((c: any) => c.ordem_servico_id).filter(Boolean)
    );

    let tipoComissao: 'porcentagem' | 'fixo' = 'porcentagem';
    let valorBaseComissao = 10;
    if (tecnico.tipo_comissao) {
      tipoComissao = tecnico.tipo_comissao as 'porcentagem' | 'fixo';
      valorBaseComissao =
        tipoComissao === 'fixo' ? (tecnico.comissao_fixa ?? 0) : (tecnico.comissao_percentual ?? 10);
    } else if (configEmpresaRow?.tipo_comissao) {
      tipoComissao = configEmpresaRow.tipo_comissao as 'porcentagem' | 'fixo';
      valorBaseComissao =
        tipoComissao === 'fixo'
          ? (configEmpresaRow.comissao_fixa_padrao ?? 0)
          : (configEmpresaRow.comissao_padrao ?? 10);
    }

    let comissoesPrevistas: any[] = [];
    if (!ordensError && ordensData?.length) {
      comissoesPrevistas = ordensData
        .filter((os: any) => {
          if (osComComissao.has(os.id)) return false;
          if (deveExcluirComissaoOs(os)) return false;
          if (
            deveBloquearComissaoRetornoGarantia(
              configEmpresaRow?.comissao_retorno_ativo,
              os.tipo,
              os.os_garantia_id
            )
          ) {
            return false;
          }
          const valorTotal = Number(os.valor_faturado ?? os.valor_servico ?? 0) || 0;
          if (valorTotal <= 0) return false;
          return true;
        })
        .map((os: any) => {
          const valores = resolverValoresBaseComissao({
            valorServico: os.valor_servico,
            valorPeca: os.valor_peca,
            valorFaturado: os.valor_faturado,
            apenasServico: configEmpresaRow?.comissao_apenas_servico,
          });
          const valorComissao = calcularValorComissao(tipoComissao, valorBaseComissao, valores.valorBaseCalculo);
          const dataEntregaBase = os.data_entrega || os.created_at || new Date().toISOString();
          const entregue = isFinalizada(os.status, os.status_tecnico);
          return {
            id: `prevista-${os.id}`,
            ordem_servico_id: os.id,
            numero_os: os.numero_os || 'N/A',
            valor_servico: valores.valorServico,
            valor_peca: valores.valorPeca,
            valor_total: valores.valorTotal,
            tipo_comissao: tipoComissao,
            percentual_comissao: tipoComissao === 'porcentagem' ? valorBaseComissao : null,
            valor_comissao_fixa: tipoComissao === 'fixo' ? valorBaseComissao : null,
            valor_comissao: valorComissao,
            data_entrega: dataEntregaBase,
            data_pagamento: null,
            data_calculo: null,
            status: entregue ? 'CALCULADA' : 'PREVISTA',
            tipo_ordem: (os.tipo || 'normal').toLowerCase(),
            created_at: dataEntregaBase,
            cliente_nome: os.clientes?.nome || 'Cliente não encontrado',
            servico_nome: os.servico || 'Serviço não especificado',
            ativa: true,
            observacoes: null,
            status_os: os.status || null,
            status_tecnico_os: os.status_tecnico || null,
          };
        });
    }

    const comissoes = [...comissoesFormatadasFiltradas, ...comissoesPrevistas];
    return NextResponse.json({ comissoes });
  } catch (e: any) {
    console.error('Erro /api/comissoes/tecnicos/[id]:', e);
    return NextResponse.json({ error: e?.message || 'Erro ao carregar comissões' }, { status: 500 });
  }
}
