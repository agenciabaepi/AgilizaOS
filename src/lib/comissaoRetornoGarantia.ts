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

function normalizeStatusComissao(s: string | null | undefined): string {
  if (!s) return '';
  return s.trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function isStatusSemReparoOs(statusTecnico?: string | null): boolean {
  const st = normalizeStatusComissao(statusTecnico).replace(/_/g, ' ').trim();
  return st === 'SEM REPARO' || st === 'SEMREPARO';
}

/** OS que não devem gerar comissão (recusa, sem conserto, status técnico SEM REPARO). */
export function deveExcluirComissaoOs(params: {
  cliente_recusou?: boolean | null;
  aparelho_sem_conserto?: boolean | null;
  status?: string | null;
  status_tecnico?: string | null;
}): boolean {
  if (params.cliente_recusou === true) return true;
  if (params.aparelho_sem_conserto === true) return true;
  const st = normalizeStatusComissao(params.status);
  const stt = normalizeStatusComissao(params.status_tecnico);
  if (st === 'CLIENTE RECUSOU' || stt === 'CLIENTE RECUSOU') return true;
  if (isStatusSemReparoOs(params.status_tecnico)) return true;
  return false;
}
