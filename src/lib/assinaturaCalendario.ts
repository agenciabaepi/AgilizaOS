/**
 * Diferença em dias civis (horário local): dataRef − hoje.
 * 0 = mesmo dia; <0 = data já passou.
 */
export function diffDiasCalendario(dataRefIso: string | null | undefined, agora = new Date()): number | null {
  if (!dataRefIso) return null;
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  const ref = new Date(dataRefIso);
  if (Number.isNaN(ref.getTime())) return null;
  ref.setHours(0, 0, 0, 0);
  return Math.ceil((ref.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}
