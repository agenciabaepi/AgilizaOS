import { deveExcluirComissaoOs } from '@/lib/comissaoRetornoGarantia';

/** Prazo da garantia legal de serviços (CDC art. 26) — 90 dias a partir da entrega */
export const GARANTIA_LEGAL_DIAS = 90;

type OsGarantiaCampos = {
  cliente_recusou?: boolean | null;
  clienteRecusou?: boolean | null;
  aparelho_sem_conserto?: boolean | null;
  aparelhoSemConserto?: boolean | null;
  status?: string | null;
  statusOS?: string | null;
  status_tecnico?: string | null;
  statusTecnico?: string | null;
};

/** Só OS com reparo concluído têm garantia (exclui recusa, sem conserto, SEM REPARO). */
export function osElegivelParaGarantia(os: OsGarantiaCampos): boolean {
  return !deveExcluirComissaoOs({
    cliente_recusou: os.cliente_recusou ?? os.clienteRecusou,
    aparelho_sem_conserto: os.aparelho_sem_conserto ?? os.aparelhoSemConserto,
    status: os.status ?? os.statusOS,
    status_tecnico: os.status_tecnico ?? os.statusTecnico,
  });
}

/** @deprecated use osElegivelParaGarantia */
export function deveRegistrarGarantiaNaEntrega(opts: {
  cliente_recusou?: boolean | null;
  aparelho_sem_conserto?: boolean | null;
  status?: string | null;
  status_tecnico?: string | null;
}): boolean {
  return osElegivelParaGarantia(opts);
}

export function toDateOnlyLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateOnlyLocal(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const parsed = parseDateOnlyLocal(dateOnly);
  if (!parsed) return dateOnly;
  parsed.setDate(parsed.getDate() + days);
  return toDateOnlyLocal(parsed);
}

/** Vencimento = data de entrega + N dias (padrão: 90 dias legais) */
export function calcularVencimentoGarantia(
  dataEntrega: string | Date | null | undefined,
  dias: number = GARANTIA_LEGAL_DIAS
): string | null {
  if (!dataEntrega) return null;
  const base =
    typeof dataEntrega === 'string'
      ? (dataEntrega.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null)
      : toDateOnlyLocal(dataEntrega);
  if (!base) return null;
  return addDaysToDateOnly(base, dias);
}

/** Usa vencimento gravado ou calcula a partir da data de entrega (somente se elegível) */
export function resolverVencimentoGarantiaOs(
  os: OsGarantiaCampos & {
    vencimento_garantia?: string | null;
    data_entrega?: string | null;
  }
): string {
  if (!osElegivelParaGarantia(os)) return '';
  if (os.vencimento_garantia) {
    const m = os.vencimento_garantia.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return calcularVencimentoGarantia(os.data_entrega) ?? '';
}

/** Estima data de entrega quando só há vencimento (uso em listagens) */
export function estimarDataEntregaDeGarantia(vencimentoGarantia: string | null | undefined): string {
  if (!vencimentoGarantia) return '';
  const base = vencimentoGarantia.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? vencimentoGarantia;
  return addDaysToDateOnly(base, -GARANTIA_LEGAL_DIAS);
}

export function isGarantiaVencida(garantia: string | null | undefined): boolean {
  const dataGarantia = parseDateOnlyLocal(garantia);
  if (!dataGarantia) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return dataGarantia < hoje;
}

export function isGarantiaVencidaOs(os: OsGarantiaCampos & { garantia?: string | null }): boolean {
  if (!osElegivelParaGarantia(os)) return false;
  return isGarantiaVencida(os.garantia);
}
