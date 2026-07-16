/** Dias de acesso concedidos por cada pagamento confirmado. */
export const DIAS_ACESSO_PAGAMENTO = 30;

/**
 * Calcula a nova cobertura após um pagamento.
 *
 * Regra de adiantamento:
 * - Se ainda há dias válidos (cobertura atual > data do pagamento),
 *   o novo vencimento = coberturaAtual + 30 dias (só adiantou o pagamento).
 * - Se já venceu (ou não há cobertura), novo vencimento = dataPagamento + 30.
 */
export function calcularCoberturaAposPagamento(params: {
  dataPagamentoYmd: string;
  coberturaAtualYmd?: string | null;
  diasCiclo?: number;
}): {
  baseYmd: string;
  coberturaYmd: string;
  dataFimIso: string;
  adiantou: boolean;
} {
  const dias = params.diasCiclo ?? DIAS_ACESSO_PAGAMENTO;
  const pay = String(params.dataPagamentoYmd || '').slice(0, 10);
  const atual = params.coberturaAtualYmd
    ? String(params.coberturaAtualYmd).slice(0, 10)
    : null;

  const adiantou = !!(atual && atual > pay);
  const baseYmd = adiantou ? atual! : pay;
  const coberturaYmd = addDaysYmdExported(baseYmd, dias);

  return {
    baseYmd,
    coberturaYmd,
    dataFimIso: `${coberturaYmd}T12:00:00.000Z`,
    adiantou,
  };
}

export function isoToYmd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const s = String(iso).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function maxCoberturaYmdFromAssinatura(assinatura: {
  data_fim?: string | null;
  proxima_cobranca?: string | null;
} | null | undefined): string | null {
  if (!assinatura) return null;
  const dates = [assinatura.data_fim, assinatura.proxima_cobranca]
    .map((v) => isoToYmd(v))
    .filter(Boolean) as string[];
  if (!dates.length) return null;
  return dates.sort().at(-1) ?? null;
}

function addDaysYmdExported(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
