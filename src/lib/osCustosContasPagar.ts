/**
 * Cálculos de custo/lucro da O.S. (informação operacional interna).
 * Não usar em rotas públicas, PDF/impressão para cliente ou link de acompanhamento.
 */

/** Soma o valor das contas a pagar vinculadas a uma O.S. (custo de peças/fornecedor). */
export function somarCustosContasPagarOS(
  contas: Array<{ valor?: number | string | null }> | null | undefined
): number {
  return (contas ?? []).reduce((acc, c) => acc + Number(c.valor || 0), 0);
}

export function calcularLucroOS(receita: number, custo: number) {
  const lucro = receita - custo;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  return { lucro, margem };
}
