import type { AparelhoSelecionado } from '@/types/aparelhos';

export const OS_EDIT_DRAFT_VERSION = 1;

export type OsEditDraftKind = 'editar' | 'bancada';

export interface OsEditDraftItem {
  id?: string;
  nome: string;
  preco: number;
  quantidade?: number;
  total?: number;
}

export interface OsEditarDraftPayload {
  observacoesInternas: string;
  marca: string;
  modelo: string;
  cor: string;
  numeroSerie: string;
  acessorios: string;
  condicoesEquipamento: string;
  equipamento: string;
  relato: string;
  observacao: string;
  laudo: string;
  termoGarantiaId: string;
  checklistEntrada: Record<string, boolean>;
  produtos: OsEditDraftItem[];
  servicos: OsEditDraftItem[];
  statusSelecionadoId: string | null;
  tecnicoKey: string | null;
  aparelhoSelecionado: AparelhoSelecionado | null;
  aparelhoImagemUrl: string | null;
}

export interface OsBancadaDraftPayload {
  statusTecnico: string;
  laudo: string;
  observacoes: string;
  produtosSelecionados: OsEditDraftItem[];
  servicosSelecionados: OsEditDraftItem[];
  checklistData: Record<string, unknown> | null;
}

export interface OsEditDraftEnvelope<T> {
  version: number;
  kind: OsEditDraftKind;
  updatedAt: string;
  osId: string;
  data: T;
}

function draftStorageKey(osId: string, kind: OsEditDraftKind, usuarioAuthId?: string | null): string {
  const userPart = usuarioAuthId?.trim() || 'anon';
  return `os_edit_draft_${kind}_${osId}_${userPart}`;
}

export function loadOsEditDraft<T>(
  osId: string | undefined,
  kind: OsEditDraftKind,
  usuarioAuthId?: string | null
): OsEditDraftEnvelope<T> | null {
  if (typeof window === 'undefined' || !osId) return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(osId, kind, usuarioAuthId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OsEditDraftEnvelope<T>;
    if (parsed.version !== OS_EDIT_DRAFT_VERSION || parsed.kind !== kind || parsed.osId !== osId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveOsEditDraft<T>(
  osId: string,
  kind: OsEditDraftKind,
  usuarioAuthId: string | null | undefined,
  data: T
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: OsEditDraftEnvelope<T> = {
      version: OS_EDIT_DRAFT_VERSION,
      kind,
      updatedAt: new Date().toISOString(),
      osId,
      data,
    };
    localStorage.setItem(draftStorageKey(osId, kind, usuarioAuthId), JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function clearOsEditDraft(
  osId: string | undefined,
  kind: OsEditDraftKind,
  usuarioAuthId?: string | null
): void {
  if (typeof window === 'undefined' || !osId) return;
  try {
    localStorage.removeItem(draftStorageKey(osId, kind, usuarioAuthId));
  } catch {
    // ignore
  }
}

function hasText(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

export function isOsEditarDraftMeaningful(data: OsEditarDraftPayload): boolean {
  if (
    hasText(data.relato) ||
    hasText(data.observacao) ||
    hasText(data.laudo) ||
    hasText(data.observacoesInternas) ||
    hasText(data.acessorios) ||
    hasText(data.condicoesEquipamento) ||
    hasText(data.marca) ||
    hasText(data.modelo) ||
    hasText(data.cor) ||
    hasText(data.numeroSerie)
  ) {
    return true;
  }
  if (data.produtos.length > 0 || data.servicos.length > 0) return true;
  if (Object.values(data.checklistEntrada).some(Boolean)) return true;
  if (data.statusSelecionadoId || data.tecnicoKey) return true;
  return false;
}

export function isOsBancadaDraftMeaningful(data: OsBancadaDraftPayload): boolean {
  if (hasText(data.laudo) || hasText(data.observacoes) || hasText(data.statusTecnico)) return true;
  if (data.produtosSelecionados.length > 0 || data.servicosSelecionados.length > 0) return true;
  if (data.checklistData && Object.keys(data.checklistData).length > 0) return true;
  return false;
}

export function formatOsDraftUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
