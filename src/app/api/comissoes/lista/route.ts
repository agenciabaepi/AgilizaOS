import { NextResponse } from 'next/server';
import { getAuthUserIdFromRequest } from '@/lib/supabase/authFromRequest';
import { createAdminClient } from '@/lib/supabaseClient';
import { deveBloquearComissaoRetornoGarantia, deveExcluirComissaoOs } from '@/lib/comissaoRetornoGarantia';
import {
  fetchComissoesHistoricoRows,
  fetchOrdensPrevistasRows,
  osRowFromComissao,
} from '@/lib/comissoesQueryCompat';
import { TECNICOS_OR_FILTER } from '@/lib/tecnicos';

/**
 * GET /api/comissoes/lista
 * Retorna TODAS as comissões da empresa (todos os técnicos), mesma lógica do detalhe.
 * Usa admin client para evitar RLS e garantir consistência com a página de detalhe do técnico.
 * Requer sessão (admin/gestor).
 */
export async function GET(request: Request) {
  try {
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

    // Mapa tecnico_id (id ou auth_user_id) -> { id: usuarios.id, nome, tipo_comissao, comissao_fixa, comissao_percentual, comissao_ativa }
    const { data: tecnicosData } = await supabase
      .from('usuarios')
      .select('id, nome, auth_user_id, tipo_comissao, comissao_fixa, comissao_percentual, comissao_ativa')
      .eq('empresa_id', empresaId)
      .or(TECNICOS_OR_FILTER);
    const tecnicosMap = new Map<string, { id: string; nome: string; tipo_comissao: string; comissao_fixa: number; comissao_percentual: number; comissao_ativa: boolean }>();
    (tecnicosData || []).forEach((t: any) => {
      const rec = { id: t.id, nome: t.nome || 'Técnico', tipo_comissao: t.tipo_comissao || 'porcentagem', comissao_fixa: t.comissao_fixa ?? 0, comissao_percentual: t.comissao_percentual ?? 10, comissao_ativa: t.comissao_ativa !== false };
      tecnicosMap.set(t.id, rec);
      if (t.auth_user_id) tecnicosMap.set(t.auth_user_id, rec);
    });

    const resolveTecnico = (tecnicoId: string) => {
      const t = tecnicosMap.get(tecnicoId);
      return t ? { tecnico_id: t.id, tecnico_nome: t.nome, comissao_ativa: t.comissao_ativa, tipo_comissao: t.tipo_comissao, comissao_fixa: t.comissao_fixa, comissao_percentual: t.comissao_percentual } : { tecnico_id: tecnicoId, tecnico_nome: 'Técnico não encontrado', comissao_ativa: true, tipo_comissao: 'porcentagem' as const, comissao_fixa: 0, comissao_percentual: 10 };
    };

    const norm = (s: string | null | undefined) => (s || '').trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    const rawReais = await fetchComissoesHistoricoRows((osJoinFields, includeAtiva) => {
      const baseFields = `
        id,
        tecnico_id,
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
        ${includeAtiva ? 'ativa,' : ''}
        observacoes,
        ordens_servico:ordem_servico_id ( ${osJoinFields} ),
        clientes:cliente_id ( nome )
      `;
      return supabase
        .from('comissoes_historico')
        .select(baseFields)
        .eq('empresa_id', empresaId)
        .order('data_entrega', { ascending: false })
        .order('created_at', { ascending: false });
    });
    const comissoesReais = rawReais
      .map((c: any) => {
        const os = osRowFromComissao(c);
        const tec = resolveTecnico(c.tecnico_id);
        return {
          id: c.id,
          tecnico_id: tec.tecnico_id,
          tecnico_nome: tec.tecnico_nome,
          ordem_servico_id: c.ordem_servico_id,
          numero_os: os?.numero_os || 'N/A',
          cliente_nome: c.clientes?.nome || 'Cliente não encontrado',
          servico_nome: os?.servico || 'Serviço não especificado',
          valor_servico: c.valor_servico || 0,
          valor_peca: c.valor_peca || 0,
          valor_total: c.valor_total || 0,
          tipo_comissao: c.tipo_comissao || 'porcentagem',
          percentual_comissao: c.percentual_comissao,
          valor_comissao_fixa: c.valor_comissao_fixa,
          valor_comissao: c.valor_comissao || 0,
          data_entrega: c.data_entrega,
          status: c.status || 'CALCULADA',
          tipo_ordem: c.tipo_ordem || 'normal',
          created_at: c.created_at,
          ativa: c.ativa !== undefined ? c.ativa : true,
          tecnico_comissao_ativa: tec.comissao_ativa,
          observacoes: c.observacoes || null,
          status_os: os?.status || null,
          status_tecnico_os: os?.status_tecnico || null,
          cliente_recusou_os: os?.cliente_recusou ?? null,
          aparelho_sem_conserto_os: os?.aparelho_sem_conserto ?? null,
        };
      })
      .filter((c: any) =>
        !deveExcluirComissaoOs({
          cliente_recusou: c.cliente_recusou_os,
          aparelho_sem_conserto: c.aparelho_sem_conserto_os,
          status: c.status_os,
          status_tecnico: c.status_tecnico_os,
        })
      );

    const osComComissao = new Set(comissoesReais.map((c: any) => c.ordem_servico_id).filter(Boolean));

    // Config padrão empresa
    const { data: configEmpresa } = await supabase
      .from('configuracoes_comissao')
      .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao, comissao_retorno_ativo')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    // 2) Todas as OS com técnico e valor, que ainda não têm comissão (previstas)
    const { data: ordensData, error: ordensError } = await fetchOrdensPrevistasRows((selectFields) =>
      supabase
        .from('ordens_servico')
        .select(selectFields)
        .eq('empresa_id', empresaId)
        .not('tecnico_id', 'is', null)
        .order('created_at', { ascending: false })
    );
    const isFinalizada = (status: string | null | undefined, statusTec: string | null | undefined) => {
      const s = norm(status);
      const t = norm(statusTec || '');
      return s === 'ENTREGUE' || t === 'REPARO CONCLUÍDO' || t === 'REPARO CONCLUIDO' || t.includes('ENTREGUE') || t.includes('REPARO CONCLUIDO');
    };

    let comissoesPrevistas: any[] = [];
    if (!ordensError && ordensData?.length) {
      comissoesPrevistas = ordensData
        .filter((os: any) => {
          if (osComComissao.has(os.id)) return false;
          if (deveExcluirComissaoOs(os)) return false;
          if (
            deveBloquearComissaoRetornoGarantia(
              configEmpresa?.comissao_retorno_ativo,
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
          const tec = resolveTecnico(os.tecnico_id);
          const tipoComissao = (tec.tipo_comissao === 'fixo' ? 'fixo' : 'porcentagem') as 'porcentagem' | 'fixo';
          const valorBase = tipoComissao === 'fixo' ? tec.comissao_fixa : tec.comissao_percentual;
          const valorTotal = Number(os.valor_faturado ?? os.valor_servico ?? 0) || 0;
          const valorServico = Number(os.valor_servico ?? valorTotal) || valorTotal;
          const valorComissao = tipoComissao === 'fixo' ? valorBase : (valorServico * valorBase) / 100;
          const dataEntregaBase = os.data_entrega || os.created_at || new Date().toISOString();
          const entregue = isFinalizada(os.status, os.status_tecnico);
          return {
            id: `prevista-${os.id}`,
            tecnico_id: tec.tecnico_id,
            tecnico_nome: tec.tecnico_nome,
            ordem_servico_id: os.id,
            numero_os: os.numero_os || 'N/A',
            cliente_nome: os.clientes?.nome || 'Cliente não encontrado',
            servico_nome: os.servico || 'Serviço não especificado',
            valor_servico: valorServico,
            valor_peca: os.valor_peca || 0,
            valor_total: valorTotal,
            tipo_comissao: tipoComissao,
            percentual_comissao: tipoComissao === 'porcentagem' ? valorBase : null,
            valor_comissao_fixa: tipoComissao === 'fixo' ? valorBase : null,
            valor_comissao: valorComissao,
            data_entrega: dataEntregaBase,
            status: entregue ? 'CALCULADA' : 'PREVISTA',
            tipo_ordem: (os.tipo || 'normal').toLowerCase(),
            created_at: dataEntregaBase,
            ativa: true,
            tecnico_comissao_ativa: tec.comissao_ativa,
            observacoes: null,
            status_os: os.status || null,
            status_tecnico_os: os.status_tecnico || null
          };
        });
    }

    const comissoes = [...comissoesReais, ...comissoesPrevistas];
    const tecnicos = (tecnicosData || []).map((t: any) => ({ id: t.id, nome: t.nome || 'Técnico' }));
    return NextResponse.json({ comissoes, tecnicos });
  } catch (e: any) {
    console.error('Erro /api/comissoes/lista:', e);
    return NextResponse.json({ error: e?.message || 'Erro ao carregar comissões' }, { status: 500 });
  }
}
