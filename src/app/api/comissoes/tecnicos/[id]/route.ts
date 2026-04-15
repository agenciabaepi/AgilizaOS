import { NextResponse } from 'next/server';
import { getAuthUserIdFromRequest } from '@/lib/supabase/authFromRequest';
import { createAdminClient } from '@/lib/supabaseClient';

/**
 * GET /api/comissoes/tecnicos/[id]
 * Retorna comissões reais + previstas do técnico (mesma lógica que /api/comissoes/minhas).
 * Usa admin client para evitar RLS e garantir mesma lista que a página do técnico.
 * Requer sessão (admin/gestor da mesma empresa).
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

    // Quem está pedindo (admin/gestor)
    const { data: quemPediu, error: userError } = await supabase
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (userError || !quemPediu?.empresa_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    const empresaId = quemPediu.empresa_id;

    // Técnico deve ser da mesma empresa
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

    // 1) Comissões reais (OR tecnico_id = id ou auth_user_id + empresa_id)
    let comissoesQuery = supabase
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
        status,
        tipo_ordem,
        created_at,
        ativa,
        observacoes,
        ordens_servico:ordem_servico_id ( numero_os, servico, status, status_tecnico ),
        clientes:cliente_id ( nome )
      `)
      .eq('empresa_id', empresaId)
      .order('data_entrega', { ascending: false })
      .order('created_at', { ascending: false });

    if (authUserIdTecnico && authUserIdTecnico !== tecnicoTabelaId) {
      comissoesQuery = comissoesQuery.or(`tecnico_id.eq.${tecnicoTabelaId},tecnico_id.eq.${authUserIdTecnico}`);
    } else {
      comissoesQuery = comissoesQuery.eq('tecnico_id', tecnicoTabelaId);
    }

    let rawComissoes: any[] = [];
    const { data: comissoesData, error: comissoesError } = await comissoesQuery;
    if (comissoesError && (comissoesError.message?.includes('ativa') || comissoesError.code === '42703')) {
      let retry = supabase
        .from('comissoes_historico')
        .select(`
          id, ordem_servico_id, valor_servico, valor_peca, valor_total,
          tipo_comissao, percentual_comissao, valor_comissao_fixa, valor_comissao,
          data_entrega, status, tipo_ordem, created_at,
          ordens_servico:ordem_servico_id ( numero_os, servico, status, status_tecnico ),
          clientes:cliente_id ( nome )
        `)
        .eq('empresa_id', empresaId)
        .order('data_entrega', { ascending: false })
        .order('created_at', { ascending: false });
      if (authUserIdTecnico && authUserIdTecnico !== tecnicoTabelaId) {
        retry = retry.or(`tecnico_id.eq.${tecnicoTabelaId},tecnico_id.eq.${authUserIdTecnico}`);
      } else {
        retry = retry.eq('tecnico_id', tecnicoTabelaId);
      }
      const retryResult = await retry;
      if (!retryResult.error) rawComissoes = retryResult.data || [];
    } else if (!comissoesError) {
      rawComissoes = comissoesData || [];
    }

    const osRow = (c: any) => (Array.isArray(c.ordens_servico) ? c.ordens_servico[0] : c.ordens_servico);
    const comissoesFormatadas = rawComissoes.map((c: any) => {
      const os = osRow(c);
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
        status: c.status || 'CALCULADA',
        tipo_ordem: c.tipo_ordem || 'normal',
        created_at: c.created_at,
        cliente_nome: c.clientes?.nome || 'Cliente não encontrado',
        servico_nome: os?.servico || 'Serviço não especificado',
        ativa: c.ativa !== undefined ? c.ativa : true,
        observacoes: c.observacoes || null,
        status_os: os?.status || null,
        status_tecnico_os: os?.status_tecnico || null
      };
    });

    const norm = (s: string | null | undefined) => (s || '').trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const isClienteRecusouOs = (c: { status_os?: string | null; status_tecnico_os?: string | null }) =>
      norm(c.status_os) === 'CLIENTE RECUSOU' || norm(c.status_tecnico_os) === 'CLIENTE RECUSOU';
    /** OS finalizada = entregue ou reparo concluído → comissão deve aparecer como DISPONÍVEL (CALCULADA), não PREVISTA */
    const isFinalizada = (status: string | null | undefined, statusTec: string | null | undefined) => {
      const s = norm(status);
      const t = norm(statusTec || '');
      return s === 'ENTREGUE' || t === 'REPARO CONCLUÍDO' || t === 'REPARO CONCLUIDO' || t.includes('ENTREGUE') || t.includes('REPARO CONCLUIDO');
    };
    const comissoesFormatadasFiltradas = comissoesFormatadas.filter((c: any) => !isClienteRecusouOs(c));

    const osComComissao = new Set(comissoesFormatadasFiltradas.map((c: any) => c.ordem_servico_id).filter(Boolean));

    // 2) Config comissão do técnico
    let tipoComissao: 'porcentagem' | 'fixo' = 'porcentagem';
    let valorBaseComissao = 10;
    if (tecnico.tipo_comissao) {
      tipoComissao = tecnico.tipo_comissao as 'porcentagem' | 'fixo';
      valorBaseComissao = tipoComissao === 'fixo' ? (tecnico.comissao_fixa ?? 0) : (tecnico.comissao_percentual ?? 10);
    } else {
      const { data: configEmpresa } = await supabase
        .from('configuracoes_comissao')
        .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      if (configEmpresa?.tipo_comissao) {
        tipoComissao = configEmpresa.tipo_comissao as 'porcentagem' | 'fixo';
        valorBaseComissao = tipoComissao === 'fixo' ? (configEmpresa.comissao_fixa_padrao ?? 0) : (configEmpresa.comissao_padrao ?? 10);
      }
    }

    // 3) OS para previstas (OR tecnico_id = id ou auth_user_id)
    const orFilter = authUserIdTecnico && authUserIdTecnico !== tecnicoTabelaId
      ? `tecnico_id.eq.${tecnicoTabelaId},tecnico_id.eq.${authUserIdTecnico}`
      : `tecnico_id.eq.${tecnicoTabelaId}`;

    const { data: ordensData, error: ordensError } = await supabase
      .from('ordens_servico')
      .select(`
        id, numero_os, valor_faturado, valor_servico, valor_peca,
        status, status_tecnico, tipo, data_entrega, created_at,
        cliente_recusou,
        clientes:cliente_id ( nome ), servico
      `)
      .eq('empresa_id', empresaId)
      .or(orFilter)
      .not('tecnico_id', 'is', null)
      .order('created_at', { ascending: false });

    const isClienteRecusouPrevista = (os: any) =>
      !!os.cliente_recusou || norm(os.status) === 'CLIENTE RECUSOU' || norm(os.status_tecnico) === 'CLIENTE RECUSOU';

    let comissoesPrevistas: any[] = [];
    if (!ordensError && ordensData?.length) {
      comissoesPrevistas = ordensData
        .filter((os: any) => {
          if (osComComissao.has(os.id)) return false;
          if (isClienteRecusouPrevista(os)) return false;
          const valorTotal = Number(os.valor_faturado ?? os.valor_servico ?? 0) || 0;
          if (valorTotal <= 0) return false;
          return true;
        })
        .map((os: any) => {
          const valorTotal = Number(os.valor_faturado ?? os.valor_servico ?? 0) || 0;
          const valorServico = Number(os.valor_servico ?? valorTotal) || valorTotal;
          const valorComissao = tipoComissao === 'fixo' ? valorBaseComissao : (valorServico * valorBaseComissao) / 100;
          const dataEntregaBase = os.data_entrega || os.created_at || new Date().toISOString();
          const entregue = isFinalizada(os.status, os.status_tecnico);
          return {
            id: `prevista-${os.id}`,
            ordem_servico_id: os.id,
            numero_os: os.numero_os || 'N/A',
            valor_servico: valorServico,
            valor_peca: os.valor_peca || 0,
            valor_total: valorTotal,
            tipo_comissao: tipoComissao,
            percentual_comissao: tipoComissao === 'porcentagem' ? valorBaseComissao : null,
            valor_comissao_fixa: tipoComissao === 'fixo' ? valorBaseComissao : null,
            valor_comissao: valorComissao,
            data_entrega: dataEntregaBase,
            status: entregue ? 'CALCULADA' : 'PREVISTA',
            tipo_ordem: (os.tipo || 'normal').toLowerCase(),
            created_at: dataEntregaBase,
            cliente_nome: os.clientes?.nome || 'Cliente não encontrado',
            servico_nome: os.servico || 'Serviço não especificado',
            ativa: true,
            observacoes: null,
            status_os: os.status || null,
            status_tecnico_os: os.status_tecnico || null
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
