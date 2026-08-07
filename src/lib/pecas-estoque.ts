/** Estoque baixo: até 1 unidade acima do mínimo (ainda disponível). */
export function isUltimasPecas(estoque: number, estoqueMin = 0): boolean {
  const atual = Number(estoque) || 0;
  const minimo = Number(estoqueMin) || 0;
  return atual > 1 && atual <= minimo + 1;
}

/** Única unidade restante. */
export function isUltimaPeca(estoque: number): boolean {
  return (Number(estoque) || 0) === 1;
}
