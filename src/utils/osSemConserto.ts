import { isStatusSemReparoOs } from '@/lib/comissaoRetornoGarantia';
import { getStatusTecnicoLabel } from '@/utils/statusLabels';

function normStatusVal(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object' && v !== null && 'nome' in v && typeof (v as { nome: string }).nome === 'string') {
    return (v as { nome: string }).nome.trim();
  }
  return String(v).trim();
}

function normStatusCompare(v: unknown): string {
  return normStatusVal(v)
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ')
    .trim();
}

/** OS entregue sem conserto (flag, SEM REPARO ou legado com REPARO CONCLUÍDO sem venda). */
export function inferirAparelhoSemConsertoOs(
  item: {
    status?: unknown;
    status_tecnico?: unknown;
    cliente_recusou?: boolean | null;
    aparelho_sem_conserto?: boolean | null;
  },
  temVenda = false
): boolean {
  if (item.aparelho_sem_conserto) return true;
  if (isStatusSemReparoOs(normStatusVal(item.status_tecnico))) return true;
  return false;
}

export function getStatusTecnicoOrdemExibicao(
  ordem: {
    status?: string | null;
    status_tecnico?: string | null;
    aparelho_sem_conserto?: boolean | null;
    cliente_recusou?: boolean | null;
  },
  temVenda = false
): {
  aparelhoSemConserto: boolean;
  statusTecnico: string;
  label: string;
} {
  const aparelhoSemConserto = inferirAparelhoSemConsertoOs(ordem, temVenda);
  const statusTecnicoDb = normStatusVal(ordem.status_tecnico) || '';
  const statusTecnico = aparelhoSemConserto ? 'SEM REPARO' : statusTecnicoDb;
  const label =
    getStatusTecnicoLabel(ordem.status, statusTecnico, {
      aparelhoSemConserto,
      clienteRecusou: !!ordem.cliente_recusou,
    }) || 'N/A';

  return { aparelhoSemConserto, statusTecnico, label };
}
