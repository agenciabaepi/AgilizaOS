/**
 * Extrai o número da OS em texto de observações (ex.: venda criada na entrega).
 * Mesma lógica de `financeiro/vendas/page.tsx` → `extrairNumeroOS`.
 */
export function extrairNumeroOSDaObservacao(observacoes?: string | null): string | null {
  if (!observacoes) return null;
  const match =
    observacoes.match(/(?:O\.?S\.?|OS)\s*#\s*(\d+)/i) ||
    observacoes.match(/(?:O\.?S\.?|OS)\s*N[º°oO]?\s*\.?\s*(\d+)/i) ||
    observacoes.match(/#\s*(\d+)/);
  return match?.[1] ?? null;
}
