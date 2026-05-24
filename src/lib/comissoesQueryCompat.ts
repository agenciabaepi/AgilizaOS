/** Campos de ordens_servico em joins/selects de comissões. */
export const OS_JOIN_SELECT_COM =
  'numero_os, servico, status, status_tecnico, aparelho_sem_conserto, cliente_recusou';

export const OS_JOIN_SELECT_LEGACY =
  'numero_os, servico, status, status_tecnico, cliente_recusou';

export const OS_PREVISTA_SELECT_COM = `
  id, numero_os, tecnico_id, valor_faturado, valor_servico, valor_peca,
  status, status_tecnico, tipo, os_garantia_id, data_entrega, created_at,
  cliente_recusou, aparelho_sem_conserto,
  clientes:cliente_id ( nome ), servico
`.trim();

export const OS_PREVISTA_SELECT_LEGACY = `
  id, numero_os, tecnico_id, valor_faturado, valor_servico, valor_peca,
  status, status_tecnico, tipo, os_garantia_id, data_entrega, created_at,
  cliente_recusou,
  clientes:cliente_id ( nome ), servico
`.trim();

export const OS_FINALIZADA_SELECT_COM =
  'id, numero_os, status, status_tecnico, data_entrega, tecnico_id, cliente_id, valor_faturado, valor_servico, valor_peca, tipo, os_garantia_id, empresa_id, cliente_recusou, aparelho_sem_conserto';

export const OS_FINALIZADA_SELECT_LEGACY =
  'id, numero_os, status, status_tecnico, data_entrega, tecnico_id, cliente_id, valor_faturado, valor_servico, valor_peca, tipo, os_garantia_id, empresa_id, cliente_recusou';

export function isSupabaseMissingColumn(error: unknown, column: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { message?: string; code?: string };
  const msg = String(e.message || '');
  return msg.includes(column) || e.code === '42703';
}

function isRetryableComissaoQueryError(error: unknown): boolean {
  return (
    isSupabaseMissingColumn(error, 'aparelho_sem_conserto') ||
    isSupabaseMissingColumn(error, 'ativa')
  );
}

export async function fetchComissoesHistoricoRows(
  runSelect: (osJoinFields: string, includeAtiva: boolean) => Promise<{ data: unknown[] | null; error: unknown }>
): Promise<any[]> {
  const attempts: Array<[string, boolean]> = [
    [OS_JOIN_SELECT_COM, true],
    [OS_JOIN_SELECT_COM, false],
    [OS_JOIN_SELECT_LEGACY, true],
    [OS_JOIN_SELECT_LEGACY, false],
  ];

  for (const [osJoin, includeAtiva] of attempts) {
    const { data, error } = await runSelect(osJoin, includeAtiva);
    if (!error) return (data || []) as any[];
    if (!isRetryableComissaoQueryError(error)) {
      console.error('Erro ao buscar comissoes_historico:', error);
      return [];
    }
  }

  return [];
}

export async function fetchOrdensPrevistasRows(
  runSelect: (selectFields: string) => Promise<{ data: unknown[] | null; error: unknown }>
): Promise<{ data: any[]; error: unknown | null }> {
  let result = await runSelect(OS_PREVISTA_SELECT_COM);
  if (!result.error) {
    return { data: (result.data || []) as any[], error: null };
  }
  if (isSupabaseMissingColumn(result.error, 'aparelho_sem_conserto')) {
    console.warn('⚠️ Coluna aparelho_sem_conserto ausente; fallback em ordens_servico (comissões).');
    result = await runSelect(OS_PREVISTA_SELECT_LEGACY);
    if (!result.error) {
      return {
        data: ((result.data || []) as any[]).map((row) => ({
          ...row,
          aparelho_sem_conserto: false,
        })),
        error: null,
      };
    }
  }
  return { data: [], error: result.error };
}

export async function fetchOrdensFinalizadasRows(
  runSelect: (selectFields: string) => Promise<{ data: unknown[] | null; error: unknown }>
): Promise<{ data: any[]; error: unknown | null }> {
  let result = await runSelect(OS_FINALIZADA_SELECT_COM);
  if (!result.error) {
    return { data: (result.data || []) as any[], error: null };
  }
  if (isSupabaseMissingColumn(result.error, 'aparelho_sem_conserto')) {
    console.warn('⚠️ Coluna aparelho_sem_conserto ausente; fallback em ordens_servico (gerar-pendentes).');
    result = await runSelect(OS_FINALIZADA_SELECT_LEGACY);
    if (!result.error) {
      return {
        data: ((result.data || []) as any[]).map((row) => ({
          ...row,
          aparelho_sem_conserto: false,
        })),
        error: null,
      };
    }
  }
  return { data: [], error: result.error };
}

export function osRowFromComissao(c: any) {
  return Array.isArray(c?.ordens_servico) ? c.ordens_servico[0] : c?.ordens_servico;
}
