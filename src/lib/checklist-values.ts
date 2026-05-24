/** true = funciona | false = não funciona | ausente = não informado */
export type ChecklistData = Record<string, boolean>;

export function isChecklistItemAnswered(data: ChecklistData, itemId: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, itemId);
}

export function isChecklistItemOk(data: ChecklistData, itemId: string): boolean {
  return data[itemId] === true;
}

export function isChecklistItemFail(data: ChecklistData, itemId: string): boolean {
  return data[itemId] === false;
}

/** Remove sufixos tipo "FUNCIONA?" — os botões já deixam o sentido claro */
export function formatChecklistItemLabel(nome: string): string {
  const trimmed = nome.trim();
  const semInterrogacao = trimmed.replace(/\s*\?\s*$/i, '');
  const semFunciona = semInterrogacao.replace(/\s+funciona\s*$/i, '');
  return semFunciona.trim() || trimmed;
}

export function partitionChecklistItens<T extends { id: string }>(
  itens: T[],
  checklist: ChecklistData
): { ok: T[]; fail: T[]; unanswered: T[] } {
  const ok: T[] = [];
  const fail: T[] = [];
  const unanswered: T[] = [];

  for (const item of itens) {
    if (!isChecklistItemAnswered(checklist, item.id)) {
      unanswered.push(item);
    } else if (isChecklistItemOk(checklist, item.id)) {
      ok.push(item);
    } else {
      fail.push(item);
    }
  }

  return { ok, fail, unanswered };
}

export function hasAnyChecklistAnswer(data: ChecklistData): boolean {
  return Object.keys(data).some((key) => {
    if (key === 'aparelhoNaoLiga') return data[key] === true;
    return isChecklistItemAnswered(data, key);
  });
}
