import type { ChecklistItemBase } from '@/types/checklist';

export interface ChecklistItemUnificado extends ChecklistItemBase {
  origem: 'catalogo_global' | 'empresa';
}

/** Mescla itens do catálogo Consert + itens customizados da empresa (sem duplicar por nome) */
export function mergeChecklistItens(
  catalogo: ChecklistItemBase[],
  empresa: ChecklistItemBase[]
): ChecklistItemUnificado[] {
  const nomes = new Set<string>();
  const merged: ChecklistItemUnificado[] = [];

  for (const item of catalogo) {
    const key = item.nome.trim().toLowerCase();
    if (nomes.has(key)) continue;
    nomes.add(key);
    merged.push({ ...item, origem: 'catalogo_global' });
  }

  for (const item of empresa) {
    const key = item.nome.trim().toLowerCase();
    if (nomes.has(key)) continue;
    nomes.add(key);
    merged.push({ ...item, origem: 'empresa' });
  }

  return merged.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
}
