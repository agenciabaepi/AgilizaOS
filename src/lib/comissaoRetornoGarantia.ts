/**
 * OS de retorno/garantia: tipo "Retorno"/"Garantia" ou vínculo com OS original de garantia.
 */
export function isOrdemRetornoOuGarantia(
  tipo?: string | null,
  osGarantiaId?: string | null
): boolean {
  const t = String(tipo ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  if (t === 'retorno' || t === 'garantia') return true;
  const gid = osGarantiaId != null ? String(osGarantiaId).trim() : '';
  if (gid !== '') return true;
  return false;
}

/** Se a empresa desativou comissão em retornos (`comissao_retorno_ativo !== true`), não calcular/registrar. */
export function deveBloquearComissaoRetornoGarantia(
  comissaoRetornoAtivoEmpresa: boolean | null | undefined,
  tipoOs?: string | null,
  osGarantiaId?: string | null
): boolean {
  if (comissaoRetornoAtivoEmpresa === true) return false;
  return isOrdemRetornoOuGarantia(tipoOs, osGarantiaId);
}
