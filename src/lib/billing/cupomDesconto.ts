/** Normaliza código do cupom (maiúsculas, sem espaços extras). */
export function normalizarCodigoCupom(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, '');
}

/** Calcula valores com desconto percentual. */
export function calcularDescontoCupom(
  valorOriginal: number,
  percentual: number
): { valorDesconto: number; valorFinal: number } {
  const desconto = Math.round(valorOriginal * (percentual / 100) * 100) / 100;
  const final = Math.max(Math.round((valorOriginal - desconto) * 100) / 100, 0.01);
  return { valorDesconto: desconto, valorFinal: final };
}

export type CupomValidacaoResult =
  | {
      ok: true;
      cupom_id: string;
      codigo: string;
      percentual: number;
      valor_original: number;
      valor_desconto: number;
      valor_final: number;
      cupom_uso_id?: string;
    }
  | { ok: false; error: string };

export function parseCupomRpcResult(data: unknown): CupomValidacaoResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Resposta inválida do cupom' };
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return { ok: false, error: typeof row.error === 'string' ? row.error : 'Cupom inválido' };
  }
  return {
    ok: true,
    cupom_id: String(row.cupom_id),
    codigo: String(row.codigo),
    percentual: Number(row.percentual),
    valor_original: Number(row.valor_original),
    valor_desconto: Number(row.valor_desconto),
    valor_final: Number(row.valor_final),
    cupom_uso_id: row.cupom_uso_id ? String(row.cupom_uso_id) : undefined,
  };
}
