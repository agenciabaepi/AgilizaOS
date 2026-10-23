import { createAdminClient } from '@/lib/supabaseClient';
import { sendPushToTecnico } from '@/lib/push-notification-tecnico';
import { deveBloquearComissaoRetornoGarantia, deveExcluirComissaoOs } from '@/lib/comissaoRetornoGarantia';
import { fetchOrdensFinalizadasRows } from '@/lib/comissoesQueryCompat';
import { isUsuarioTecnico, TECNICOS_OR_FILTER } from '@/lib/tecnicos';
import { calcularValorComissao, resolverValoresBaseComissao, type TipoComissao } from '@/lib/calcularComissao';

function normalizeStatus(s: string | null | undefined): string {
  if (!s) return '';
  return s.trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function isFinalizada(status: string, statusTecnico: string): boolean {
  const st = normalizeStatus(status);
  const stt = normalizeStatus(statusTecnico);
  return st === 'ENTREGUE' || stt === 'REPARO CONCLUÍDO' || stt === 'REPARO CONCLUIDO';
}

export type GerarComissoesResultado = {
  geradas: number;
  totalPendentes: number;
  erros: string[];
};

type TecnicoRec = {
  id: string;
  nome: string;
  nivel?: string | null;
  tambem_tecnico?: boolean | null;
  tipo_comissao?: string | null;
  comissao_fixa?: number | null;
  comissao_percentual?: number | null;
  empresa_id?: string | null;
  comissao_ativa?: boolean | null;
};

/**
 * Cria registros reais em comissoes_historico para OS entregues sem comissão.
 * Otimizado: lookup de técnicos em lote + insert em lote (sem N+1).
 */
export async function gerarComissoesPendentesEmpresa(
  empresaId: string,
  opts?: { notificarPush?: boolean; supabase?: ReturnType<typeof createAdminClient> }
): Promise<GerarComissoesResultado> {
  const supabase = opts?.supabase || createAdminClient();
  const notificarPush = opts?.notificarPush === true;
  const erros: string[] = [];

  // Só olha OS entregues nos últimos 24 meses (cobre arrasto real sem varrer histórico antigo)
  const desde = new Date();
  desde.setMonth(desde.getMonth() - 24);
  const desdeIso = desde.toISOString();

  const [{ data: ordens, error: ordensError }, { data: comissoesExistentes }, { data: tecnicosRows }, { data: configEmpresa }] =
    await Promise.all([
      fetchOrdensFinalizadasRows((selectFields) =>
        supabase
          .from('ordens_servico')
          .select(selectFields)
          .eq('empresa_id', empresaId)
          .not('tecnico_id', 'is', null)
          .not('data_entrega', 'is', null)
          .gte('data_entrega', desdeIso)
      ),
      supabase.from('comissoes_historico').select('ordem_servico_id').eq('empresa_id', empresaId),
      supabase
        .from('usuarios')
        .select('id, nome, auth_user_id, nivel, tambem_tecnico, tipo_comissao, comissao_fixa, comissao_percentual, empresa_id, comissao_ativa')
        .eq('empresa_id', empresaId)
        .or(TECNICOS_OR_FILTER),
      supabase
        .from('configuracoes_comissao')
        .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao, comissao_retorno_ativo, comissao_apenas_servico')
        .eq('empresa_id', empresaId)
        .maybeSingle(),
    ]);

  if (ordensError) {
    return { geradas: 0, totalPendentes: 0, erros: [ordensError.message || 'Erro ao buscar OS'] };
  }

  const tecnicosMap = new Map<string, TecnicoRec>();
  for (const t of tecnicosRows || []) {
    tecnicosMap.set(t.id, t);
    if (t.auth_user_id) tecnicosMap.set(t.auth_user_id, t);
  }

  const osComComissao = new Set((comissoesExistentes || []).map((c: any) => c.ordem_servico_id));

  const osPendentes = (ordens || []).filter((os: any) => {
    if (osComComissao.has(os.id)) return false;
    if (!isFinalizada(os.status || '', os.status_tecnico || '')) return false;
    if (deveExcluirComissaoOs(os)) return false;
    return true;
  });

  if (osPendentes.length === 0) {
    return { geradas: 0, totalPendentes: 0, erros: [] };
  }

  const agora = new Date().toISOString();
  const inserts: Record<string, unknown>[] = [];
  const pushTargets: Array<{ tecnicoId: string; numeroOs: string; osId: string }> = [];

  for (const os of osPendentes) {
    const tecnicoData = tecnicosMap.get(os.tecnico_id);
    if (!tecnicoData || !isUsuarioTecnico(tecnicoData) || tecnicoData.comissao_ativa === false) {
      erros.push(`OS #${os.numero_os}: técnico não encontrado ou sem comissão ativa`);
      continue;
    }

    if (
      deveBloquearComissaoRetornoGarantia(
        configEmpresa?.comissao_retorno_ativo,
        os.tipo,
        os.os_garantia_id
      )
    ) {
      continue;
    }

    let tipoComissao: TipoComissao = 'porcentagem';
    let taxaComissao = 10;
    if (tecnicoData.tipo_comissao) {
      tipoComissao = tecnicoData.tipo_comissao === 'fixo' ? 'fixo' : 'porcentagem';
      taxaComissao =
        tipoComissao === 'fixo'
          ? (tecnicoData.comissao_fixa ?? 0)
          : (tecnicoData.comissao_percentual ?? 10);
    } else if (configEmpresa?.tipo_comissao) {
      tipoComissao = configEmpresa.tipo_comissao === 'fixo' ? 'fixo' : 'porcentagem';
      taxaComissao =
        tipoComissao === 'fixo'
          ? (configEmpresa.comissao_fixa_padrao ?? 0)
          : (configEmpresa.comissao_padrao ?? 10);
    }

    const valores = resolverValoresBaseComissao({
      valorServico: os.valor_servico,
      valorPeca: os.valor_peca,
      valorFaturado: os.valor_faturado,
      apenasServico: configEmpresa?.comissao_apenas_servico,
    });

    if (tipoComissao === 'porcentagem' && valores.valorBaseCalculo <= 0) continue;

    const valorComissaoCalculado = calcularValorComissao(
      tipoComissao,
      taxaComissao,
      valores.valorBaseCalculo
    );
    if (valorComissaoCalculado <= 0) continue;

    const empresaIdComissao = os.empresa_id || empresaId || tecnicoData.empresa_id || null;
    if (!empresaIdComissao) {
      erros.push(`OS #${os.numero_os}: empresa_id ausente`);
      continue;
    }

    const dadosComissao: Record<string, unknown> = {
      tecnico_id: tecnicoData.id,
      ordem_servico_id: os.id,
      empresa_id: empresaIdComissao,
      cliente_id: os.cliente_id,
      valor_servico: valores.valorServico,
      valor_peca: valores.valorPeca,
      valor_total: valores.valorTotal,
      tipo_comissao: tipoComissao,
      valor_comissao: valorComissaoCalculado,
      data_entrega: os.data_entrega,
      data_calculo: agora,
      status: 'CALCULADA',
      tipo_ordem: (os.tipo || 'normal').toLowerCase(),
      observacoes: 'Gerado automaticamente (comissão pendente de OS entregue)',
    };
    if (tipoComissao === 'porcentagem') {
      dadosComissao.percentual_comissao = taxaComissao;
    } else {
      dadosComissao.valor_comissao_fixa = taxaComissao;
      dadosComissao.percentual_comissao = 0;
    }

    inserts.push(dadosComissao);
    if (notificarPush) {
      pushTargets.push({ tecnicoId: os.tecnico_id, numeroOs: os.numero_os, osId: os.id });
    }
  }

  let geradas = 0;
  const CHUNK = 50;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const chunk = inserts.slice(i, i + CHUNK);
    const { error: insertError } = await supabase.from('comissoes_historico').insert(chunk);
    if (insertError) {
      // Fallback item a item se o lote falhar (ex.: unique parcial)
      for (const row of chunk) {
        const { error: oneErr } = await supabase.from('comissoes_historico').insert(row);
        if (oneErr) {
          erros.push(`OS insert: ${oneErr.message}`);
        } else {
          geradas++;
        }
      }
    } else {
      geradas += chunk.length;
    }
  }

  if (notificarPush && pushTargets.length > 0) {
    await Promise.allSettled(
      pushTargets.map((t) =>
        sendPushToTecnico(supabase, t.tecnicoId, {
          title: `✅ O.S. #${t.numeroOs} entregue e faturada`,
          body: 'Sua comissão já foi calculada 🤑💰',
          data: { os_id: t.osId },
        })
      )
    );
  }

  return { geradas, totalPendentes: osPendentes.length, erros };
}
